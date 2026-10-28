import { PrismaClient } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { GuestsService } from './guests.service';

/**
 * Tes konkurensi untuk GuestsService.checkIn().
 *
 * BUG YANG DIUJI
 * --------------
 * Implementasi lama memakai pola read-check-write:
 *   1. findUnique(guest + checkins)
 *   2. validasi "sudah check-in?" di memori
 *   3. $transaction(create checkin + update guest)
 *
 * Tidak ada penguncian di antara langkah 1 dan 3. Dua perangkat yang menekan
 * check-in pada saat yang hampir bersamaan sama-sama membaca checkedIn=false,
 * sama-sama lolos validasi, dan sama-sama menulis. Akibatnya satu tamu bisa
 * tercatat check-in berkali-kali dan checkinCount ikut membengkak.
 *
 * Tes ini menggunakan PostgreSQL sungguhan karena race condition hanya muncul
 * pada eksekusi paralel nyata, bukan pada mock.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public';

const CONCURRENCY = 20;

/** Stub ringan - checkIn() tidak memakai audit maupun cache. */
const auditStub = { log: jest.fn() } as any;
const eventsStub = { getActive: jest.fn(), getActiveId: jest.fn() } as any;
const cacheStub = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any;

describe('GuestsService.checkIn — konkurensi', () => {
  let prisma: PrismaClient;
  let service: GuestsService;
  let eventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();

    // Gagal cepat dengan pesan jelas bila skema belum diterapkan.
    try {
      await prisma.event.count();
    } catch (err) {
      throw new Error(
        `Database uji belum siap (${TEST_DB_URL}).\n` +
          `Jalankan: bash scripts/test-db.sh\n` +
          `Penyebab: ${(err as Error).message}`,
      );
    }

    service = new GuestsService(prisma as any, auditStub, eventsStub, cacheStub);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Urutan penting: anak dulu, induk kemudian.
    await prisma.prizeWinner.deleteMany();
    await prisma.guestCheckin.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.event.deleteMany();

    const event = await prisma.event.create({
      data: {
        name: 'Event Tes Konkurensi',
        isActive: true,
        allowMultipleCheckin: false,
        maxCheckinCount: 1,
        allowMultipleCheckinPerCounter: false,
      },
    });
    eventId = event.id;
  });

  const createGuest = (guestId = 'TAMU-001') =>
    prisma.guest.create({
      data: {
        queueNumber: 1,
        guestId,
        name: 'Tamu Uji',
        tableLocation: 'Meja 1',
        eventId,
      },
    });

  it('mode single: 20 permintaan paralel menghasilkan tepat 1 keberhasilan', async () => {
    const guest = await createGuest();
    const adminId = 'admin-1';

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () => service.checkIn(guest.id, adminId, 'Admin Satu')),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const conflicts = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof ConflictException,
    );
    const unexpected = results.filter(
      (r) => r.status === 'rejected' && !(r.reason instanceof ConflictException),
    );

    if (unexpected.length > 0) {
      throw new Error(
        `Ada error tak terduga: ${unexpected.map((r: any) => r.reason?.message).join(' | ')}`,
      );
    }

    expect(fulfilled).toHaveLength(1);
    expect(conflicts).toHaveLength(CONCURRENCY - 1);
  });

  it('mode single: hanya satu baris GuestCheckin yang tercatat', async () => {
    const guest = await createGuest('TAMU-002');

    await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () => service.checkIn(guest.id, 'admin-1', 'Admin Satu')),
    );

    const checkins = await prisma.guestCheckin.findMany({
      where: { guestId: guest.id },
    });
    expect(checkins).toHaveLength(1);

    const after = await prisma.guest.findUnique({ where: { id: guest.id } });
    expect(after?.checkinCount).toBe(1);
    expect(after?.checkedIn).toBe(true);
  });

  it('mode per-counter: 5 admin berbeda paralel menghasilkan 5 keberhasilan', async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        allowMultipleCheckin: true,
        allowMultipleCheckinPerCounter: true,
        maxCheckinCount: 99,
      },
    });
    const guest = await createGuest('TAMU-003');
    const admins = ['a1', 'a2', 'a3', 'a4', 'a5'];

    const results = await Promise.allSettled(
      admins.map((id) => service.checkIn(guest.id, id, `Admin ${id}`)),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);

    const after = await prisma.guest.findUnique({ where: { id: guest.id } });
    expect(after?.checkinCount).toBe(5);
  });

  it('mode per-counter: 10 permintaan dari admin yang sama menghasilkan 1 keberhasilan', async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        allowMultipleCheckin: true,
        allowMultipleCheckinPerCounter: true,
        maxCheckinCount: 99,
      },
    });
    const guest = await createGuest('TAMU-004');

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.checkIn(guest.id, 'admin-sama', 'Admin Sama')),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);

    const checkins = await prisma.guestCheckin.findMany({
      where: { guestId: guest.id },
    });
    expect(checkins).toHaveLength(1);
  });

  it('mode multiple dengan batas: tidak pernah melebihi maxCheckinCount', async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        allowMultipleCheckin: true,
        allowMultipleCheckinPerCounter: false,
        maxCheckinCount: 3,
      },
    });
    const guest = await createGuest('TAMU-005');

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, (_, i) =>
        service.checkIn(guest.id, `admin-${i}`, `Admin ${i}`),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);

    const after = await prisma.guest.findUnique({ where: { id: guest.id } });
    expect(after?.checkinCount).toBe(3);
  });
});
