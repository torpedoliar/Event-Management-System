import { Controller, Get, Put, Post, Body, Query, Res, UseGuards, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { PublicRegistrationService } from './public-registration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateRegistrationConfigDto } from './dto/update-registration-config.dto';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';
import { PUBLIC_READ_LIMIT, PUBLIC_SUBMIT_LIMIT } from '../common/throttler/throttler.limits';

// Sebelumnya tanpa batas sama sekali. Endpoint submit adalah satu-satunya
// jalur publik yang MENULIS data tanpa autentikasi, sehingga paling rawan spam.
@Throttle(PUBLIC_READ_LIMIT)
@Controller()
export class PublicRegistrationController {
  private readonly logger = new Logger(PublicRegistrationController.name);

  constructor(private readonly service: PublicRegistrationService) {}

  // --- Public API (no auth) ---

  @Get('public/events')
  async getPublicEvents(@Res() res: Response) {
    const data = await this.service.getPublicEvents();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  }

  @Get('public/registration/config')
  async getPublicConfig(@Query('eventId') eventId: string | undefined, @Res() res: Response) {
    const data = await this.service.getPublicConfig(eventId || undefined);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  }

  @Throttle(PUBLIC_SUBMIT_LIMIT)
  @Post('public/registration/submit')
  async submitRegistration(@Body() dto: SubmitRegistrationDto) {
    try {
      return await this.service.submitRegistration(dto);
    } catch (error: any) {
      this.logger.error(`submitRegistration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Admin API (JWT) ---

  @UseGuards(JwtAuthGuard)
  @Get('admin/public-registration')
  async getAdminConfig(@Res() res: Response) {
    const data = await this.service.getAdminConfig();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/public-registration')
  async updateConfig(@Body() dto: UpdateRegistrationConfigDto) {
    try {
      return await this.service.updateConfig(dto);
    } catch (error: any) {
      this.logger.error(`updateConfig failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/public-registration/stats')
  async getStats(@Res() res: Response) {
    const data = await this.service.getStats();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  }
}
