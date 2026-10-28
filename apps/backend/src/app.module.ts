import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { RequestLoggingMiddleware } from './common/logger/request-logging.middleware';
import { AuditModule } from './common/audit';
import { ReportsModule } from './reports/reports.module';
import { EmailModule } from './email/email.module';
import { StationsModule } from './stations/stations.module';
import { LandingPageModule } from './landing-page/landing-page.module';
import { PublicRegistrationModule } from './public-registration/public-registration.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { OpsModule } from './ops/ops.module';
import { throttlerConfig } from './common/throttler/throttler.config';
import { StationThrottlerGuard } from './common/throttler/station-throttler.guard';

import { HealthController } from './health.controller';

import { RedisCacheModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot(throttlerConfig),
    RedisCacheModule,
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
    LandingPageModule,
    PublicRegistrationModule,
    TournamentsModule,
    OpsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: StationThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Memberi requestId + satu baris log terstruktur per permintaan.
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
