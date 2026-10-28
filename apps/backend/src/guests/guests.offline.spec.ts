import { PrismaClient } from '@prisma/client';
import { GuestsService } from './guests.service';

/**
 * Tes konkurensi untuk jalur OFFLINE (multi-station).
 *
 * Skenario nyata di lapangan: dua station kehilangan koneksi, sama-sama
 * melakukan check-in untuk tamu yang sama, lalu keduanya menyinkronkan
 * bersamaan ketika jaringan pulih. Sebelum perbaikan, keduanya membaca
 * daftar check-in lama dan sama-sama menyimpulkan "belum check-in".
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public';

const auditStub = { log: jest.fn() } as any;
const cacheStub = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any;

describe('GuestsService — konkurensi jalur offline', () => {
  let prisma: PrismaClient;
  let service: GuestsService;
  let eventsStub: any;
  let event: any;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();
    await prisma.event.count(); // validasi skema tersedia
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.prizeWinner.deleteMany();
    await prisma.guestCheckin.deleteMany();
    await prisma.checkinStation.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.event.deleteMany();

    event = await prisma.event.create({
      data: {
        name: 'Event Offline',
        isActive: true,
        allowMultipleCheckin: false,
        maxCheckinCount: 1,
        allowMultipleCheckinPerCounter: false,
      },
    });

    // getActiveEventId() memakai EventsService — berikan event yang sedang dibuat.
    eventsStub = { getActive: jest.fn().mockResolvedValue(event) };
    service = new GuestsService(prisma as any, auditStub, eventsStub, cacheStub);
  });

  const createGuest = (guestId: string) =>
    prisma.guest.create({
      data: {
        queueNumber: 1,
        guestId,
        name: 'Tamu Offline',
        tableLocation: 'Meja 1',
        eventId: event.id,
      },
    });

  it('banyak station menyinkronkan tamu yang sama bersamaan: hanya 1 yang dihitung check-in', async () => {
    const guest = await createGuest('OFF-001');
    const STATIONS = 6;

    // Enam station sync serentak. Dengan hanya dua panggilan, kedua permintaan
    // sering keburu terserialisasi secara alami sehingga race tidak muncul -
    // jumlah yang lebih besar membuat jendela balapan benar-benar terbuka.
    const results = await Promise.all(
      Array.from({ length: STATIONS }, (_, i) =>
        service.syncBatchFromStation(
          `station-${i}`,
          null,
          [{ guestIdentifier: guest.guestId, clientTimestamp: new Date().toISOString() }],
          `Station ${i}`,
        ),
      ),
    );

    // Tepat satu station yang benar-benar mencatat check-in; sisanya konflik.
    expect(results.filter((r) => r.successCount === 1)).toHaveLength(1);
    expect(results.reduce((sum, r) => sum + (r.conflictCount ?? 0), 0)).toBe(STATIONS - 1);

    const after = await prisma.guest.findUnique({ where: { id: guest.id } });
    expect(after?.checkinCount).toBe(1);
    expect(after?.checkedIn).toBe(true);

    const rows = await prisma.guestCheckin.findMany({ where: { guestId: guest.id } });
    expect(rows.filter((r) => !r.isDuplicate)).toHaveLength(1);
  });

  it('checkInOffline paralel untuk tamu yang sama: hanya 1 dianggap sukses', async () => {
    const guest = await createGuest('OFF-002');
    const ts = new Date().toISOString();

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        service.checkInOffline(`station-${i}`, guest.guestId, ts, `Station ${i}`),
      ),
    );

    expect(results.filter((r) => r.success)).toHaveLength(1);

    const after = await prisma.guest.findUnique({ where: { id: guest.id } });
    expect(after?.checkinCount).toBe(1);
  });

  it('sinkronisasi ulang dengan clientTimestamp sama bersifat idempoten', async () => {
    const guest = await createGuest('OFF-003');
    const ts = new Date().toISOString();

    const first = await service.syncBatchFromStation(
      'station-a',
      null,
      [{ guestIdentifier: guest.guestId, clientTimestamp: ts }],
      'Station A',
    );
    expect(first.successCount).toBe(1);

    // Pengiriman ulang karena jaringan terputus setelah server menerima.
    const second = await service.syncBatchFromStation(
      'station-a',
      null,
      [{ guestIdentifier: guest.guestId, clientTimestamp: ts }],
      'Station A',
    );
    expect(second.successCount).toBe(1); // tetap sukses agar antrean klien dibersihkan
    expect(second.results[0].reason).toBe('already_synced');

    const rows = await prisma.guestCheckin.findMany({ where: { guestId: guest.id } });
    expect(rows).toHaveLength(1);
  });
});
