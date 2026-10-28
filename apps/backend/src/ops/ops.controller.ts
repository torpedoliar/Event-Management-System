import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Endpoint pemantauan operasional. Dilindungi JWT karena memuat nama event
 * dan statistik kehadiran.
 */
@Controller('ops')
@UseGuards(JwtAuthGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('metrics')
  getMetrics() {
    return this.ops.getMetrics();
  }
}
