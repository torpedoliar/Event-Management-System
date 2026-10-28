import { PrismaClient } from '@prisma/client';
import { BracketEngineService } from './bracket-engine.service';

/**
 * Tes mesin bagan turnamen sistem gugur.
 *
 * Logika ini mudah salah dan sulit terlihat secara manual sampai turnamen
 * berjalan: BYE yang tidak maju otomatis, tim yang muncul di dua tempat,
 * atau juara bertemu di putaran pertama. Semuanya dijaga di sini.
 */

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:test@localhost:55433/guest_registry_test?schema=public';

describe('BracketEngineService — single elimination', () => {
  let prisma: PrismaClient;
  let engine: BracketEngineService;
  let tournamentId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
    await prisma.$connect();
    await prisma.event.count();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.tournamentCheckin.deleteMany();
    await prisma.matchParticipant.deleteMany();
    await prisma.matchSet.deleteMany();
    await prisma.match.updateMany({ data: { nextMatchId: null } });
    await prisma.match.deleteMany();
    await prisma.bracketRound.deleteMany();
    await prisma.tournamentBracket.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.tournamentTeam.deleteMany();
    await prisma.tournament.deleteMany();

    const tournament = await prisma.tournament.create({
      data: {
        name: 'Turnamen Uji',
        sportType: 'FUTSAL',
        formatType: 'SINGLE_ELIM',
        participantType: 'TEAM',
      },
    });
    tournamentId = tournament.id;

    engine = new BracketEngineService(prisma as any);
  });

  /** Membuat tim dengan seed 1..n. */
  const seedTeams = async (n: number) => {
    const teams = [];
    for (let i = 1; i <= n; i++) {
      teams.push(
        await prisma.tournamentTeam.create({
          data: { tournamentId, name: `Tim ${i}`, seed: i },
        }),
      );
    }
    return teams;
  };

  const buildBracket = async (n: number) => {
    const teams = await seedTeams(n);
    const matches = await engine.generateSingleElimination(
      tournamentId,
      teams.map((t) => ({ id: t.id, name: t.name, seed: t.seed! })),
    );
    return { teams, matches };
  };

  const roundsOf = () =>
    prisma.bracketRound.findMany({
      where: { bracket: { tournamentId } },
      orderBy: { roundNumber: 'asc' },
    });

  it('menolak kurang dari 2 tim', async () => {
    const [team] = await seedTeams(1);
    await expect(
      engine.generateSingleElimination(tournamentId, [
        { id: team.id, name: team.name, seed: 1 },
      ]),
    ).rejects.toThrow('Minimum 2 teams required');
  });

  it('membuat jumlah putaran dan pertandingan yang benar untuk 4 tim', async () => {
    const { matches } = await buildBracket(4);

    const rounds = await roundsOf();
    expect(rounds).toHaveLength(2);
    expect(matches).toHaveLength(3); // 2 semifinal + 1 final
    expect(rounds.map((r) => r.name)).toEqual(['Semi-Final', 'Final']);
  });

  it('membuat bagan lengkap 8 tim (3 putaran, 7 pertandingan)', async () => {
    const { matches } = await buildBracket(8);

    const rounds = await roundsOf();
    expect(rounds).toHaveLength(3);
    expect(matches).toHaveLength(7);
    expect(rounds.map((r) => r.name)).toEqual(['Quarter-Final', 'Semi-Final', 'Final']);
  });

  it('menyambungkan setiap pertandingan ke pertandingan berikutnya', async () => {
    const { matches } = await buildBracket(8);

    const withNext = matches.filter((m) => m.nextMatchId !== null);
    expect(withNext).toHaveLength(6); // semua kecuali final
    expect(matches.filter((m) => m.nextMatchId === null)).toHaveLength(1); // final

    // Setiap pertandingan lanjutan menerima tepat 2 slot (A dan B).
    const slots = withNext.map((m) => m.nextMatchSlot);
    expect(slots.filter((s) => s === 'A')).toHaveLength(3);
    expect(slots.filter((s) => s === 'B')).toHaveLength(3);
  });

  it('menempatkan unggulan teratas di paruh berbeda (folded seeding)', async () => {
    const { teams } = await buildBracket(4);

    const firstRound = await prisma.match.findMany({
      where: { tournamentId, round: { roundNumber: 1 } },
      orderBy: { matchNumber: 'asc' },
    });

    // Seeding baku untuk 4 tim: pasangan (1,4) dan (2,3).
    expect(firstRound[0].teamAId).toBe(teams[0].id); // unggulan 1
    expect(firstRound[0].teamBId).toBe(teams[3].id); // unggulan 4
    expect(firstRound[1].teamAId).toBe(teams[1].id); // unggulan 2
    expect(firstRound[1].teamBId).toBe(teams[2].id); // unggulan 3
  });

  it('unggulan 1 dan 2 tidak bertemu sebelum final', async () => {
    const { teams } = await buildBracket(4);

    const final = await prisma.match.findFirst({
      where: { tournamentId, round: { roundNumber: 2 } },
      include: { round: true },
    });
    const semis = await prisma.match.findMany({
      where: { tournamentId, round: { roundNumber: 1 } },
    });

    const seed1Semi = semis.find((m) => m.teamAId === teams[0].id || m.teamBId === teams[0].id);
    const seed2Semi = semis.find((m) => m.teamAId === teams[1].id || m.teamBId === teams[1].id);

    expect(seed1Semi).toBeDefined();
    expect(seed2Semi).toBeDefined();
    expect(seed1Semi!.id).not.toBe(seed2Semi!.id); // hanya bisa bertemu di final
    expect(final).not.toBeNull();
  });

  it('memajukan tim otomatis saat BYE (3 tim)', async () => {
    const { teams, matches } = await buildBracket(3);

    const firstRound = matches.filter((m) => m.roundId === matches[0].roundId);
    const walkovers = firstRound.filter((m) => m.status === 'WALKOVER');

    // Seeding 4 slot dengan 3 tim: satu pasangan hanya berisi 1 tim.
    expect(walkovers).toHaveLength(1);
    expect(walkovers[0].winnerId).not.toBeNull();

    // Tim yang menang BYE harus sudah muncul di final.
    const final = await prisma.match.findFirst({
      where: { tournamentId, round: { roundNumber: 2 } },
    });
    const advancedTeamId = walkovers[0].winnerId;
    expect([final!.teamAId, final!.teamBId]).toContain(advancedTeamId);

    // Tim unggulan 1 adalah yang mendapat BYE.
    expect(advancedTeamId).toBe(teams[0].id);
  });

  it('menangani beberapa BYE sekaligus (5 tim)', async () => {
    const { matches } = await buildBracket(5);

    const walkovers = matches.filter((m) => m.status === 'WALKOVER');
    expect(walkovers.length).toBe(3); // 8 slot - 5 tim = 3 BYE

    for (const m of walkovers) {
      expect(m.winnerId).not.toBeNull();
      expect(m.completedAt).not.toBeNull();
    }
  });

  it('tidak membuat pertandingan BYE untuk jumlah tim pangkat dua', async () => {
    const { matches } = await buildBracket(4);

    expect(matches.filter((m) => m.status === 'WALKOVER')).toHaveLength(0);

    // Putaran pertama harus terisi penuh. Pertandingan putaran berikutnya
    // memang sengaja kosong (placeholder) sampai pemenang ditentukan.
    const firstRoundId = matches[0].roundId;
    const firstRound = matches.filter((m) => m.roundId === firstRoundId);
    expect(firstRound).toHaveLength(2);
    expect(firstRound.filter((m) => m.teamAId === null || m.teamBId === null)).toHaveLength(0);
  });

  it('clearBracket menghapus bagan dan mengembalikan statistik tim', async () => {
    const { teams } = await buildBracket(4);

    await prisma.tournamentTeam.update({
      where: { id: teams[0].id },
      data: { wins: 3, losses: 1, draws: 2 },
    });

    await engine.clearBracket(tournamentId);

    expect(await prisma.match.count({ where: { tournamentId } })).toBe(0);
    expect(await prisma.bracketRound.count({ where: { bracket: { tournamentId } } })).toBe(0);
    expect(await prisma.tournamentBracket.count({ where: { tournamentId } })).toBe(0);

    const team = await prisma.tournamentTeam.findUnique({ where: { id: teams[0].id } });
    expect(team).toMatchObject({ wins: 0, losses: 0, draws: 0 });
  });
});
