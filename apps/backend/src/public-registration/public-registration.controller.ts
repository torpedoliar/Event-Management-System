import { Controller, Get, Put, Post, Body, Res, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { PublicRegistrationService } from './public-registration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateRegistrationConfigDto } from './dto/update-registration-config.dto';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';

@SkipThrottle({ default: true, short: true, medium: true, long: true })
@Controller()
export class PublicRegistrationController {
  private readonly logger = new Logger(PublicRegistrationController.name);

  constructor(private readonly service: PublicRegistrationService) {}

  // --- Public API (no auth) ---

  @Get('public/registration/config')
  async getPublicConfig(@Res() res: Response) {
    const data = await this.service.getPublicConfig();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  }

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
  getAdminConfig() {
    return this.service.getAdminConfig();
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
  getStats() {
    return this.service.getStats();
  }
}
