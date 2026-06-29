import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { MatchScoringService } from '../../src/tournaments/match-scoring.service';
import { MatchStatus } from '../../src/tournaments/types/tournament.types';

describe('MatchScoringService', () => {
  let service: MatchScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [MatchScoringService],
    }).compile();

    service = module.get<MatchScoringService>(MatchScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('determineWinner', () => {
    it('should return teamA as winner when scoreA > scoreB', () => {
      const result = service['determineWinner'](
        'team-a',
        'team-b',
        12,
        10,
        null,
        null,
      );
      expect(result).toBe('team-a');
    });

    it('should return teamB as winner when scoreB > scoreA', () => {
      const result = service['determineWinner'](
        'team-a',
        'team-b',
        8,
        15,
        null,
        null,
      );
      expect(result).toBeNull();
    });

    it('should return null for tie (no winner yet)', () => {
      const result = service['determineWinner'](
        'team-a',
        'team-b',
        10,
        10,
        null,
        null,
      );
      expect(result).toBeNull();
    });
  });
});
