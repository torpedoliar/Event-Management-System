import { PrismaClient } from '@prisma/client';
import { OpsService } from './ops.service';

/**
 * Tes metrik operasional.
 *
 * Angka-angka ini dipakai saat event berlangsung untuk memutuskan apakah
 * station masih sehat. Salah hitung berarti keputusan operasional yang salah.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public';

describe('OpsService.getMetrics', () => {
  let prisma: PrismaClient;
  let service: OpsService;
  let eventsStub: { getActive: jest.Mock };
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
    await prisma.checkinStation.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.event.deleteMany();

    event = await prisma.event.create({
      data: { name: 'Event Ops', isActive: true },
    });

    eventsStub = { getActive: jest.fn().mockResolvedValue(event) };
    service = new OpsService(prisma as any, eventsStub as any);
  });

  const createGuest = async (n: number, checkedIn: boolean) =>
    prisma.guest.create({
      data: {
        queueNumber: n,
        guestId: `G-${n}`,
        name: `Tamu ${n}`,
        tableLocation: 'Meja 1',
        eventId: event.id,
        checkedIn,
        checkinCount: checkedIn ? 1 : 0,
      },
    });

  it('mengembalikan angka nol saat tidak ada event aktif', async () => {
    eventsStub.getActive.mockResolvedValue(null);

    const metrics = await service.getMetrics();

    expect(metrics.activeEvent).toBeNull();
    expect(metrics.guests.total).toBe(0);
    expect(metrics.stations.lastSyncAt).toBeNull();
  });

  it('menghitung tamu dan tingkat kehadiran', async () => {
    await createGuest(1, true);
    await createGuest(2, true);
    await createGuest(3, false);
    await createGuest(4, false);

    const metrics = await service.getMetrics();

    expect(metrics.guests).toEqual({
      total: 4,
      checkedIn: 2,
      notCheckedIn: 2,
      attendanceRate: 50,
    });
  });

  it('membulatkan tingkat kehadiran dua desimal', async () => {
    await createGuest(1, true);
    await createGuest(2, false);
    await createGuest(3, false);

    const metrics = await service.getMetrics();
    expect(metrics.guests.attendanceRate).toBe(33.33);
  });

  it('menghitung check-in total, offline, dan duplikat', async () => {
    const g1 = await createGuest(1, true);
    const g2 = await createGuest(2, true);

    await prisma.guestCheckin.create({
      data: { guestId: g1.id, checkinAt: new Date(), isOffline: false },
    });
    await prisma.guestCheckin.create({
      data: { guestId: g1.id, checkinAt: new Date(), isOffline: true },
    });
    await prisma.guestCheckin.create({
      data: { guestId: g2.id, checkinAt: new Date(), isOffline: true, isDuplicate: true },
    });

    const metrics = await service.getMetrics();

    expect(metrics.checkins.total).toBe(3);
    expect(metrics.checkins.offline).toBe(2);
    expect(metrics.checkins.duplicate).toBe(1);
  });

  it('hanya menghitung check-in 24 jam terakhir untuk metrik last24h', async () => {
    const g1 = await createGuest(1, true);
    const lama = new Date(Date.now() - 48 * 60 * 60 * 1000);

    await prisma.guestCheckin.create({ data: { guestId: g1.id, checkinAt: lama } });
    await prisma.guestCheckin.create({ data: { guestId: g1.id, checkinAt: new Date() } });

    const metrics = await service.getMetrics();

    expect(metrics.checkins.total).toBe(2);
    expect(metrics.checkins.last24h).toBe(1);
  });

  it('menghitung station aktif dan yang basi', async () => {
    const baru = new Date();
    const lama = new Date(Date.now() - 60 * 60 * 1000); // 1 jam lalu

    await prisma.checkinStation.create({
      data: {
        stationId: 'st-1',
        name: 'Station 1',
        eventId: event.id,
        isActive: true,
        lastSyncAt: baru,
      },
    });
    await prisma.checkinStation.create({
      data: {
        stationId: 'st-2',
        name: 'Station 2',
        eventId: event.id,
        isActive: true,
        lastSyncAt: lama,
      },
    });
    // Station yang belum pernah sinkron juga dihitung basi.
    await prisma.checkinStation.create({
      data: {
        stationId: 'st-3',
        name: 'Station 3',
        eventId: event.id,
        isActive: false,
        lastSyncAt: null,
      },
    });

    const metrics = await service.getMetrics();

    expect(metrics.stations.total).toBe(3);
    expect(metrics.stations.active).toBe(2);
    expect(metrics.stations.stale).toBe(2); // lama + belum pernah sync
    expect(metrics.stations.lastSyncAt).not.toBeNull();
  });

  it('tidak mencampur data event lain', async () => {
    const other = await prisma.event.create({
      data: { name: 'Event Lain', isActive: false },
    });
    await prisma.guest.create({
      data: {
        queueNumber: 1,
        guestId: 'X-1',
        name: 'Tamu Lain',
        tableLocation: '-',
        eventId: other.id,
        checkedIn: true,
      },
    });
    await createGuest(1, false);

    const metrics = await service.getMetrics();

    expect(metrics.guests.total).toBe(1);
    expect(metrics.activeEvent?.id).toBe(event.id);
  });
});
