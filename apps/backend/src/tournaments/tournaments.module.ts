import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BracketEngineService } from './bracket-engine.service';

@Module({
  imports: [PrismaModule],
  providers: [BracketEngineService],
  controllers: [],
  exports: [BracketEngineService],
})
export class TournamentsModule {}
