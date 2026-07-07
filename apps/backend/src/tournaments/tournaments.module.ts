import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { BracketEngineService } from './bracket-engine.service';
import { MatchScoringService } from './match-scoring.service';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [BracketEngineService, MatchScoringService, TournamentsService],
  controllers: [TournamentsController],
  exports: [BracketEngineService, MatchScoringService, TournamentsService],
})
export class TournamentsModule {}
