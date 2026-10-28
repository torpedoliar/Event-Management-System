import { PrismaClient } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { PrizesService } from './prizes.service';

/**
 * Tes logika undian hadiah.
 *
 * Yang dijaga di sini bukan sekadar "fungsi mengembalikan array", melainkan
 * aturan yang, jika salah, langsung terlihat di acara:
 *   - jumlah pemenang tidak boleh melebihi stok hadiah,
 *   - satu tamu tidak boleh menang hadiah yang sama dua kali,
 *   - tamu yang sudah menang tidak boleh ikut undian lain (kecuali diizinkan),
 *   - undian serentak tidak boleh menggandakan pemenang.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public';

describe('PrizesService.drawWinners', () => {
  let prisma: PrismaClient;
  let service: PrizesService;
  let event: any;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();
    await prisma.event.count(); // pastikan skema tersedia
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.prizeCollection.deleteMany();
    await prisma.prizeWinner.deleteMany();
    await prisma.souvenirTake.deleteMany();
    await prisma.guestCheckin.deleteMany();
    await prisma.prize.deleteMany();
    await prisma.souvenir.deleteMany();
    await prisma.guest.deleteMany();
    await prisma.event.deleteMany();

    event = await prisma.event.create({
      data: { name: 'Event Undian', isActive: true },
    });

    const eventsStub = { getActive: jest.fn().mockResolvedValue(event) } as any;
    service = new PrizesService(prisma as any, eventsStub);
  });

  /** Membuat `n` tamu yang sudah check-in (hanya mereka yang eligible). */
  const seedGuests = async (n: number, checkedIn = true) => {
    const guests = [];
    for (let i = 0; i < n; i++) {
      guests.push(
        await prisma.guest.create({
          data: {
            queueNumber: i + 1,
            guestId: `G-${String(i + 1).padStart(3, '0')}`,
            name: `Tamu ${i + 1}`,
            tableLocation: 'Meja 1',
            eventId: event.id,
            checkedIn,
            checkinCount: checkedIn ? 1 : 0,
          },
        }),
      );
    }
    return guests;
  };

  const createPrize = (quantity: number, allowMultipleWins = false) =>
    prisma.prize.create({
      data: {
        name: 'Hadiah Uji',
        quantity,
        category: 'UTAMA',
        allowMultipleWins,
        eventId: event.id,
      },
    });

  it('mengembalikan pemenang sebanyak yang diminta', async () => {
    await seedGuests(5);
    const prize = await createPrize(3);

    const winners = await service.drawWinners(prize.id, 2);

    expect(winners).toHaveLength(2);
    expect(await prisma.prizeWinner.count({ where: { prizeId: prize.id } })).toBe(2);
  });

  it('menolak count < 1', async () => {
    const prize = await createPrize(1);
    await expect(service.drawWinners(prize.id, 0)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak hadiah yang tidak ada', async () => {
    await expect(
      service.drawWinners('11111111-1111-1111-1111-111111111111', 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tidak pernah melebihi stok hadiah', async () => {
    await seedGuests(10);
    const prize = await createPrize(1);

    await service.drawWinners(prize.id, 1);

    await expect(service.drawWinners(prize.id, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(await prisma.prizeWinner.count({ where: { prizeId: prize.id } })).toBe(1);
  });

  it('membatasi jumlah pemenang sesuai sisa stok', async () => {
    await seedGuests(10);
    const prize = await createPrize(2);

    const winners = await service.drawWinners(prize.id, 5);

    expect(winners).toHaveLength(2);
    expect(await prisma.prizeWinner.count({ where: { prizeId: prize.id } })).toBe(2);
  });

  it('hanya memilih tamu yang sudah check-in', async () => {
    await seedGuests(3, true);
    await seedGuestsAbsen(3);
    const prize = await createPrize(10);

    const winners = await service.drawWinners(prize.id, 10);

    expect(winners).toHaveLength(3);
    const ids = winners.map((w: any) => w.id);
    const allCheckedIn = await prisma.guest.count({
      where: { id: { in: ids }, checkedIn: true },
    });
    expect(allCheckedIn).toBe(3);
  });

  /** Tamu yang terdaftar tetapi belum check-in. */
  const seedGuestsAbsen = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await prisma.guest.create({
        data: {
          queueNumber: 100 + i,
          guestId: `ABSEN-${i}`,
          name: `Absen ${i}`,
          tableLocation: '-',
          eventId: event.id,
          checkedIn: false,
        },
      });
    }
  };

  it('mengecualikan tamu yang sudah menang hadiah lain (allowMultipleWins=false)', async () => {
    await seedGuests(3);
    const first = await createPrize(1);
    // Stok 2 agar kuota hadiah tidak membatasi; yang diuji adalah eksklusi pemenang.
    const second = await createPrize(2);

    const [winner] = await service.drawWinners(first.id, 1);
    const nextWinners = await service.drawWinners(second.id, 5);

    // Tersisa 2 tamu, dan pemenang pertama tidak boleh ikut lagi.
    expect(nextWinners).toHaveLength(2);
    expect(nextWinners.map((w: any) => w.id)).not.toContain(winner.id);
  });

  it('mengizinkan pemenang hadiah lain ikut undian bila allowMultipleWins=true', async () => {
    await seedGuests(3);
    const first = await createPrize(1);
    const second = await createPrize(3, true);

    const [winner] = await service.drawWinners(first.id, 1);
    const nextWinners = await service.drawWinners(second.id, 3);

    // allowMultipleWins hanya mengecualikan pemenang hadiah INI, bukan hadiah lain.
    expect(nextWinners).toHaveLength(3);
    expect(nextWinners.map((w: any) => w.id)).toContain(winner.id);
  });

  it('tidak memilih tamu yang sama dua kali untuk hadiah yang sama', async () => {
    await seedGuests(5);
    const prize = await createPrize(5);

    await service.drawWinners(prize.id, 3);
    const winners = await service.drawWinners(prize.id, 2);

    const all = await prisma.prizeWinner.findMany({ where: { prizeId: prize.id } });
    const uniqueGuests = new Set(all.map((w) => w.guestId));

    expect(all).toHaveLength(5);
    expect(uniqueGuests.size).toBe(5);
    expect(winners).toHaveLength(2);
  });

  it('undian serentak tidak boleh melebihi stok hadiah', async () => {
    await seedGuests(20);
    const prize = await createPrize(1);

    // 10 panitia menekan "Undi" pada saat yang hampir bersamaan.
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.drawWinners(prize.id, 1)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);

    const total = await prisma.prizeWinner.count({ where: { prizeId: prize.id } });
    expect(total).toBe(1);
  });
});
