import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PublicController } from './public.controller';
import { GuestsModule } from '../guests/guests.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '24h' },
    }),
    GuestsModule,
  ],
  controllers: [PublicController],
})
export class PublicModule {}
