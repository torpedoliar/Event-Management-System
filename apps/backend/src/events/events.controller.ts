import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { logosStorage, backgroundsStorage, soundsStorage } from '../common/storage';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { Response } from 'express';
import { emitEvent } from '../common/sse';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) { }

  @SkipThrottle({ default: true, short: true, medium: true, long: true })
  @Get('config/event')
  async getPublicConfig(@Res() res: Response) {
    const cfg = await this.events.getActive();
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(cfg);
  }

  // List all events
  @UseGuards(JwtAuthGuard)
  @Get('events')
  findAll() {
    return this.events.findAll();
  }

  // Get active event - MUST be before :id routes
  @UseGuards(JwtAuthGuard)
  @Get('events/active')
  getActive() {
    return this.events.getActive();
  }

  // Update active event - MUST be before :id routes
  @UseGuards(JwtAuthGuard)
  @Put('events/active')
  async updateActive(@Body() body: UpdateEventDto) {
    const updated = await this.events.setActiveConfig(body);
    // Clear any preview first, then emit config update
    emitEvent({ type: 'preview', data: null });
    emitEvent({ type: 'config', data: updated });
    return updated;
  }

  // Create new event
  @UseGuards(JwtAuthGuard)
  @Post('events')
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  // Get event by ID - MUST be after /active routes
  @UseGuards(JwtAuthGuard)
  @Get('events/:id')
  findById(@Param('id') id: string) {
    return this.events.findById(id);
  }

  // Update event by ID - MUST be after /active routes
  @UseGuards(JwtAuthGuard)
  @Put('events/:id')
  async updateById(@Param('id') id: string, @Body() body: UpdateEventDto) {
    const updated = await this.events.update(id, body as any);
    if (updated.isActive) {
      emitEvent({ type: 'config', data: updated });
    }
    return updated;
  }

  // Delete event by ID
  @UseGuards(JwtAuthGuard)
  @Delete('events/:id')
  delete(@Param('id') id: string) {
    return this.events.delete(id);
  }

  // Activate event (switch to this event)
  @UseGuards(JwtAuthGuard)
  @Post('events/:id/activate')
  async activate(@Param('id') id: string) {
    const activated = await this.events.activate(id);
    emitEvent({ type: 'event_change', data: activated });
    emitEvent({ type: 'config', data: activated });
    return activated;
  }

  // Clone event
  @UseGuards(JwtAuthGuard)
  @Post('events/:id/clone')
  clone(@Param('id') id: string, @Body('name') name?: string) {
    return this.events.clone(id, name);
  }

  // Get event stats
  @UseGuards(JwtAuthGuard)
  @Get('events/:id/stats')
  getStats(@Param('id') id: string) {
    return this.events.getStats(id);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo', {
    storage: logosStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  @Post('events/upload/logo')
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No logo file provided');
    }
    const url = `/api/uploads/branding/logos/${file.filename}`;
    const updated = await this.events.setActiveConfig({ logoUrl: url });
    // Clear any preview first, then emit config update
    emitEvent({ type: 'preview', data: null });
    emitEvent({ type: 'config', data: updated });
    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('background', {
    storage: backgroundsStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  @Post('events/upload/background')
  async uploadBackground(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No background file provided');
    }
    const url = `/api/uploads/branding/backgrounds/${file.filename}`;
    const isVideo = file.mimetype?.startsWith('video/');
    let updated;
    if (isVideo) {
      updated = await this.events.setActiveConfig({ backgroundType: 'VIDEO', backgroundVideoUrl: url, backgroundImageUrl: null });
    } else {
      updated = await this.events.setActiveConfig({ backgroundType: 'IMAGE', backgroundImageUrl: url, backgroundVideoUrl: null });
    }
    // Clear any preview first, then emit config update
    emitEvent({ type: 'preview', data: null });
    emitEvent({ type: 'config', data: updated });
    return updated;
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/purge')
  async purge(@Body('resetBranding') resetBranding?: boolean) {
    const result = await this.events.purgeActiveGuests(!!resetBranding);
    
    // Broadcast bulk-delete to force all frontends to clear IndexedDB guest cache
    emitEvent({ type: 'guest-update', data: { action: 'bulk-delete', count: result.success ? 9999 : 0 } });

    if (resetBranding) {
      const cfg = await this.events.getActive();
      emitEvent({ type: 'config', data: cfg });
    }
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/preview')
  preview(@Body() body: any) {
    const data: any = {};
    if (typeof body?.overlayOpacity === 'number') data.overlayOpacity = body.overlayOpacity;
    if (typeof body?.backgroundType === 'string') data.backgroundType = body.backgroundType;
    if (typeof body?.backgroundImageUrl === 'string') data.backgroundImageUrl = body.backgroundImageUrl;
    if (typeof body?.backgroundVideoUrl === 'string') data.backgroundVideoUrl = body.backgroundVideoUrl;
    emitEvent({ type: 'preview', data });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('events/preview/clear')
  clearPreview() {
    emitEvent({ type: 'preview', data: null });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: soundsStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  @Post('events/upload/sound/:type')
  async uploadSound(@Param('type') type: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No sound file provided');
    }
    
    const url = `/api/uploads/branding/sounds/${file.filename}`;
    let updateData: any = {};
    
    switch(type) {
      case 'roll': updateData.rollSoundUrl = url; break;
      case 'tension': updateData.tensionSoundUrl = url; break;
      case 'win': updateData.winSoundUrl = url; break;
      case 'grandwin': updateData.grandWinSoundUrl = url; break;
      default: throw new BadRequestException('Invalid sound type');
    }

    const updated = await this.events.setActiveConfig(updateData);
    emitEvent({ type: 'config', data: updated });
    return updated;
  }
}
