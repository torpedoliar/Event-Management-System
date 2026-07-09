import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { BracketEngineService } from './bracket-engine.service';
import { MatchScoringService } from './match-scoring.service';
import { TournamentCheckinService } from './tournament-checkin.service';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [PrismaModule, EventsModule],
  providers: [BracketEngineService, MatchScoringService, TournamentCheckinService, TournamentsService],
  controllers: [TournamentsController],
  exports: [BracketEngineService, MatchScoringService, TournamentCheckinService, TournamentsService],
})
export class TournamentsModule {}
