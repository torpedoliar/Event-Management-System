import { PrismaClient } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { PublicRegistrationService } from './public-registration.service';

/**
 * Tes registrasi mandiri publik.
 *
 * Ini satu-satunya endpoint publik yang MENULIS data tanpa autentikasi, jadi
 * aturan kuota, jendela waktu, dan anti-duplikat adalah pertahanan utamanya.
 * Kesalahan di sini berarti kuota event bisa jebol atau data ganda masuk.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public';

describe('PublicRegistrationService', () => {
  let prisma: PrismaClient;
  let service: PublicRegistrationService;
  let event: any;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();
    await prisma.event.count();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.prizeWinner.deleteMany();
    await prisma.guestCheckin.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.publicRegistrationConfig.deleteMany();
    await prisma.event.deleteMany();

    event = await prisma.event.create({
      data: { name: 'Event Publik', isActive: true, enablePublicRegistration: true },
    });

    const eventsStub = {
      getActive: jest.fn().mockResolvedValue(event),
      invalidateCache: jest.fn().mockResolvedValue(undefined),
    } as any;
    const guestsStub = {} as any;
    const cacheStub = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any;

    service = new PublicRegistrationService(prisma as any, eventsStub, guestsStub, cacheStub);
  });

  /** Menyiapkan konfigurasi registrasi untuk event aktif. */
  const configure = async (overrides: Record<string, any> = {}) => {
    await prisma.publicRegistrationConfig.create({
      data: {
        eventId: event.id,
        isActive: true,
        maxQuota: 0,
        preventDuplicates: false,
        guestIdPrefix: 'PUB',
        fields: [
          { key: 'name', label: 'Nama Lengkap', required: true, type: 'text' },
          { key: 'email', label: 'Email', required: false, type: 'text' },
          { key: 'phone', label: 'No HP', required: false, type: 'text' },
        ] as any,
        ...overrides,
      },
    });
  };

  const submit = (data: Record<string, string>, extra: Record<string, any> = {}) =>
    service.submitRegistration({ data, eventId: event.id, ...extra } as any);

  const countGuests = () =>
    prisma.guest.count({ where: { eventId: event.id, registrationSource: 'PUBLIC' } });

  it('mendaftarkan tamu baru dan menghasilkan guestId otomatis', async () => {
    await configure();

    const result = await submit({ name: 'Budi Santoso', email: 'budi@example.com' });

    expect(result.success).toBe(true);
    expect(result.guestId).toBe('PUB-1');
    expect(result.queueNumber).toBe(1);

    const guest = await prisma.guest.findFirst({ where: { eventId: event.id } });
    expect(guest).toMatchObject({
      name: 'Budi Santoso',
      registrationSource: 'PUBLIC',
      checkedIn: false,
    });
  });

  it('menolak pendaftaran saat fitur dimatikan', async () => {
    await configure();
    await prisma.event.update({
      where: { id: event.id },
      data: { enablePublicRegistration: false },
    });

    await expect(submit({ name: 'Budi' })).rejects.toBeInstanceOf(BadRequestException);
    expect(await countGuests()).toBe(0);
  });

  it('menolak pendaftaran sebelum jendela waktu dibuka', async () => {
    const besok = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await configure({ openAt: besok });

    await expect(submit({ name: 'Budi' })).rejects.toBeInstanceOf(BadRequestException);
    expect(await countGuests()).toBe(0);
  });

  it('menolak pendaftaran setelah jendela waktu ditutup', async () => {
    const kemarin = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await configure({ closeAt: kemarin });

    await expect(submit({ name: 'Budi' })).rejects.toBeInstanceOf(BadRequestException);
    expect(await countGuests()).toBe(0);
  });

  it('menolak pendaftaran saat kuota penuh', async () => {
    await configure({ maxQuota: 2 });

    await submit({ name: 'Tamu 1' });
    await submit({ name: 'Tamu 2' });

    await expect(submit({ name: 'Tamu 3' })).rejects.toBeInstanceOf(BadRequestException);
    expect(await countGuests()).toBe(2);
  });

  it('kuota tidak jebol meski 10 pendaftaran dikirim serentak', async () => {
    await configure({ maxQuota: 3 });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => submit({ name: `Tamu ${i}`, email: `t${i}@x.com` })),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(3);
    expect(await countGuests()).toBe(3);
  });

  it('nomor antrean unik walau pendaftaran dilakukan serentak', async () => {
    await configure();

    await Promise.all(
      Array.from({ length: 8 }, (_, i) => submit({ name: `Tamu ${i}`, email: `u${i}@x.com` })),
    );

    const guests = await prisma.guest.findMany({
      where: { eventId: event.id },
      select: { queueNumber: true },
    });
    const unique = new Set(guests.map((g) => g.queueNumber));

    expect(guests).toHaveLength(8);
    expect(unique.size).toBe(8);
  });

  it('mencegah duplikat berdasarkan email bila preventDuplicates aktif', async () => {
    await configure({ preventDuplicates: true });

    await submit({ name: 'Budi', email: 'sama@example.com' });

    await expect(
      submit({ name: 'Budi Lain', email: 'sama@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await countGuests()).toBe(1);
  });

  it('mengizinkan email sama bila preventDuplicates mati', async () => {
    await configure({ preventDuplicates: false });

    await submit({ name: 'Budi', email: 'sama@example.com' });
    await submit({ name: 'Budi Lain', email: 'sama@example.com' });

    expect(await countGuests()).toBe(2);
  });

  it('menolak field wajib yang kosong', async () => {
    await configure();

    await expect(submit({ name: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(await countGuests()).toBe(0);
  });

  it('menolak guestId manual yang sudah dipakai', async () => {
    await configure({
      fields: [
        { key: 'name', label: 'Nama', required: true, type: 'text' },
        { key: 'guestId', label: 'ID Tamu', required: true, type: 'text' },
      ] as any,
    });

    await submit({ name: 'Tamu A', guestId: 'MANUAL-1' });

    await expect(
      submit({ name: 'Tamu B', guestId: 'MANUAL-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('honeypot terisi: tidak membuat tamu tetapi tetap melaporkan sukses ke bot', async () => {
    await configure();

    const result = await service.submitRegistration({
      data: { name: 'Bot' },
      website: 'http://spam.example.com',
      eventId: event.id,
    } as any);

    expect(result.success).toBe(true);
    expect(result.guestId).toBeNull();
    expect(await countGuests()).toBe(0);
  });

  it('menampilkan status kuota yang benar pada konfigurasi publik', async () => {
    await configure({ maxQuota: 5 });
    await submit({ name: 'Tamu 1' });

    const config = await service.getPublicConfig(event.id);

    expect(config.currentCount).toBe(1);
    expect(config.remainingQuota).toBe(4);
    expect(config.isOpen).toBe(true);
  });
});
