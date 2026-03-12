import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PublicController } from './public.controller';
import { GuestsService } from '../guests/guests.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [PublicController],
  providers: [GuestsService],
})
export class PublicModule {}
