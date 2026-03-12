import { Module, forwardRef } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { AuditModule } from '../common/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [AuditModule, forwardRef(() => AuthModule), EventsModule],
  providers: [GuestsService],
  controllers: [GuestsController],
  exports: [GuestsService],
})
export class GuestsModule {}
