import { Module } from '@nestjs/common';
import { SouvenirsController } from './souvenirs.controller';
import { SouvenirsService } from './souvenirs.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [EventsModule],
    controllers: [SouvenirsController],
    providers: [SouvenirsService, PrismaService],
    exports: [SouvenirsService]
})
export class SouvenirsModule { }
