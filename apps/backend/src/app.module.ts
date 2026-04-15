import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { GuestsModule } from './guests/guests.module';
import { PublicModule } from './public/public.module';
import { PrizesModule } from './prizes/prizes.module';
import { SouvenirsModule } from './souvenirs/souvenirs.module';
import { UsersModule } from './users/users.module';
import { LoggerModule } from './common/logger';
import { AuditModule } from './common/audit';
import { ReportsModule } from './reports/reports.module';
import { EmailModule } from './email/email.module';
import { StationsModule } from './stations/stations.module';
import { throttlerConfig } from './common/throttler/throttler.config';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot(throttlerConfig),
    LoggerModule,
    AuditModule,
    AuthModule,
    GuestsModule,
    EventsModule,
    PrizesModule,
    SouvenirsModule,
    PrismaModule,
    PublicModule,
    UsersModule,
    ReportsModule,
    EmailModule,
    StationsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
