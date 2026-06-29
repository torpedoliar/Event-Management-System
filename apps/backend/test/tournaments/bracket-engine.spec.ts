import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BracketEngineService } from '../../src/tournaments/bracket-engine.service';

describe('BracketEngineService', () => {
  let service: BracketEngineService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [BracketEngineService],
    }).compile();

    service = module.get<BracketEngineService>(BracketEngineService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateSingleElimination', () => {
    it('should generate 7 matches for 8 teams', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      expect(matches).toHaveLength(7);
    });

    it('should create 3 rounds (QF, SF, F)', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      const round1Matches = matches.filter((m) => m.matchNumber <= 4);
      const round2Matches = matches.filter(
        (m) => m.matchNumber > 4 && m.matchNumber <= 6,
      );
      const finalMatches = matches.filter((m) => m.matchNumber === 7);

      expect(round1Matches).toHaveLength(4);
      expect(round2Matches).toHaveLength(2);
      expect(finalMatches).toHaveLength(1);
    });

    it('should seed teams correctly (1 vs 8, 2 vs 7, etc.)', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      const firstMatch = matches.find((m) => m.matchNumber === 1);
      expect(firstMatch?.teamAId).toBe('team-1');
      expect(firstMatch?.teamBId).toBe('team-8');
    });

    it('should set nextMatchId for winner advancement', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      const match1 = matches.find((m) => m.matchNumber === 1);
      const match2 = matches.find((m) => m.matchNumber === 2);
      const match5 = matches.find((m) => m.matchNumber === 5); // First SF match

      expect(match1?.nextMatchId).toBe(match5?.id);
      expect(match1?.nextMatchSlot).toBe('A');
      expect(match2?.nextMatchId).toBe(match5?.id);
      expect(match2?.nextMatchSlot).toBe('B');
    });
  });

  describe('generateSingleElimination with byes', () => {
    it('should generate 15 matches for 16-team bracket with byes', async () => {
      const teams = Array.from({ length: 10 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-2',
        teams,
      );

      // 16-team bracket = 15 matches (4 QF + 2 SF + 1 F + 4 with byes in R1)
      expect(matches).toHaveLength(15);
    });

    it('should give top seeds byes in first round', async () => {
      const teams = Array.from({ length: 10 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-2',
        teams,
      );

      // Count matches with byes (missing one or both teams)
      const matchesWithByes = matches.filter(
        (m) => !m.teamAId || !m.teamBId,
      );

      // Should have some byes (matches that advance teams directly)
      expect(matchesWithByes.length).toBeGreaterThan(0);
    });
  });
});
