import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BracketEngineService } from './bracket-engine.service';
import { MatchScoringService } from './match-scoring.service';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [PrismaModule],
  providers: [BracketEngineService, MatchScoringService, TournamentsService],
  controllers: [TournamentsController],
  exports: [BracketEngineService, MatchScoringService, TournamentsService],
})
export class TournamentsModule {}
