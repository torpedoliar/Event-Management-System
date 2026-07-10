import { Module } from '@nestjs/common';
import { PublicRegistrationController } from './public-registration.controller';
import { PublicRegistrationService } from './public-registration.service';
import { EventsModule } from '../events/events.module';
import { GuestsModule } from '../guests/guests.module';

@Module({
  imports: [EventsModule, GuestsModule],
  controllers: [PublicRegistrationController],
  providers: [PublicRegistrationService],
})
export class PublicRegistrationModule {}
