import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BracketEngineService } from './bracket-engine.service';
import { MatchScoringService } from './match-scoring.service';

@Module({
  imports: [PrismaModule],
  providers: [BracketEngineService, MatchScoringService],
  controllers: [],
  exports: [BracketEngineService, MatchScoringService],
})
export class TournamentsModule {}
