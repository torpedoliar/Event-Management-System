import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { Event } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly CACHE_KEY = 'active_event';
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) { }

  async getActive(): Promise<Event | null> {
    // Try to get from Redis cache
    const cached = await this.cacheManager.get<Event>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const event = await this.prisma.event.findFirst({ where: { isActive: true } });
    
    // Save to Redis cache
    if (event) {
      await this.cacheManager.set(this.CACHE_KEY, event, this.CACHE_TTL);
    }
    
    return event;
  }

  // Invalidate cache when event is updated
  async invalidateCache() {
    await this.cacheManager.del(this.CACHE_KEY);
  }

  // Get all events
  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get event by ID
  async findById(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  // Create new event
  async create(dto: CreateEventDto): Promise<Event> {
    const data: any = {
      name: dto.name,
      isActive: false,
    };
    if (dto.date) {
      const d = new Date(dto.date);
      if (!isNaN(d.getTime())) data.date = d;
    }
    if (dto.time) data.time = dto.time;
    if (dto.location) data.location = dto.location;
    return this.prisma.event.create({ data });
  }

  // Update event by ID
  async update(id: string, input: Partial<Event>): Promise<Event> {
    const exists = await this.prisma.event.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Event not found');
    
    const data: any = { ...input };
    if (typeof data.date === 'string') {
      const ds = data.date.trim();
      if (!ds) {
        delete data.date;
      } else {
        const d = new Date(ds);
        if (!isNaN(d.getTime())) data.date = d;
        else throw new BadRequestException('Invalid date format');
      }
    }
    
    const updated = await this.prisma.event.update({ where: { id }, data });
    if (updated.isActive) await this.invalidateCache();
    return updated;
  }

  // Delete event by ID
  async delete(id: string): Promise<{ success: boolean }> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.isActive) throw new BadRequestException('Cannot delete active event');
    
    await this.prisma.event.delete({ where: { id } });
    return { success: true };
  }

  // Activate event (set as current active event)
  async activate(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    // Deactivate all events first
    await this.prisma.event.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate the selected event
    const activated = await this.prisma.event.update({
      where: { id },
      data: { isActive: true },
    });

    await this.invalidateCache();
    return activated;
  }

  // Clone event with souvenirs and prizes
  async clone(id: string, newName?: string): Promise<Event> {
    const source = await this.prisma.event.findUnique({
      where: { id },
      include: {
        souvenirs: true,
        prizes: true,
      },
    });
    if (!source) throw new NotFoundException('Event not found');

    // Create new event with copied settings
    const cloned = await this.prisma.event.create({
      data: {
        name: newName || `${source.name} (Copy)`,
        date: source.date,
        time: source.time,
        location: source.location,
        logoUrl: source.logoUrl,
        backgroundType: source.backgroundType,
        backgroundImageUrl: source.backgroundImageUrl,
        backgroundVideoUrl: source.backgroundVideoUrl,
        overlayOpacity: source.overlayOpacity,
        checkinPopupTimeoutMs: source.checkinPopupTimeoutMs,
        enablePhotoCapture: source.enablePhotoCapture,
        enableLuckyDraw: source.enableLuckyDraw,
        enableSouvenir: source.enableSouvenir,
        allowDuplicateGuestId: source.allowDuplicateGuestId,
        allowMultipleCheckinPerCounter: source.allowMultipleCheckinPerCounter,
        requireCheckinForSouvenir: source.requireCheckinForSouvenir,
        customCategories: source.customCategories as any,
        isActive: false,
      },
    });

    // Clone souvenirs
    if (source.souvenirs.length > 0) {
      await this.prisma.souvenir.createMany({
        data: source.souvenirs.map((s) => ({
          name: s.name,
          description: s.description,
          imageUrl: s.imageUrl,
          quantity: s.quantity,
          eventId: cloned.id,
        })),
      });
    }

    // Clone prizes
    if (source.prizes.length > 0) {
      await this.prisma.prize.createMany({
        data: source.prizes.map((p) => ({
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          quantity: p.quantity,
          category: p.category,
          allowMultipleWins: p.allowMultipleWins,
          eventId: cloned.id,
        })),
      });
    }

    return cloned;
  }

  // Get event statistics
  async getStats(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const [totalGuests, checkedIn, souvenirs, prizes] = await Promise.all([
      this.prisma.guest.count({ where: { eventId: id } }),
      this.prisma.guest.count({ where: { eventId: id, checkedIn: true } }),
      this.prisma.souvenir.count({ where: { eventId: id } }),
      this.prisma.prize.count({ where: { eventId: id } }),
    ]);

    return { totalGuests, checkedIn, souvenirs, prizes };
  }

  async setActiveConfig(input: {
    name?: string;
    date?: Date | string | null;
    time?: string | null;
    location?: string | null;
    logoUrl?: string | null;
    backgroundType?: 'NONE' | 'IMAGE' | 'VIDEO';
    backgroundImageUrl?: string | null;
    backgroundVideoUrl?: string | null;
    overlayOpacity?: number;
    checkinPopupTimeoutMs?: number;
    enablePhotoCapture?: boolean;
    enableLuckyDraw?: boolean;
    enableSouvenir?: boolean;
    allowDuplicateGuestId?: boolean;
    allowMultipleCheckinPerCounter?: boolean;
    requireCheckinForSouvenir?: boolean;
    customCategories?: Array<{ value: string; label: string; color: string }> | null;
  }) {
    const active = await this.getActive();
    if (!active) {
      const data: any = {
        ...input,
        isActive: true,
        name: input.name || 'New Event',
      };
      if (typeof data.date === 'string') {
        const ds = data.date.trim();
        if (!ds) {
          delete data.date;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
          const iso = ds + 'T00:00:00.000Z';
          const d = new Date(iso);
          if (!isNaN(d.getTime())) data.date = d;
        } else {
          const d = new Date(ds);
          if (!isNaN(d.getTime())) data.date = d;
        }
      }
      const created = await this.prisma.event.create({ data });
      await this.invalidateCache();
      return created;
    }
    const data: any = { ...input };
    if (data.date === null) {
      // Keep null as is - to clear the date
    } else if (typeof data.date === 'string') {
      const ds = data.date.trim();
      if (!ds) {
        data.date = null;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
        const iso = ds + 'T00:00:00.000Z';
        const d = new Date(iso);
        if (isNaN(d.getTime())) throw new BadRequestException('Invalid date format');
        data.date = d;
      } else {
        const d = new Date(ds);
        if (isNaN(d.getTime())) throw new BadRequestException('Invalid date format');
        data.date = d;
      }
    }
    const updated = await this.prisma.event.update({ where: { id: active.id }, data });
    await this.invalidateCache();
    return updated;
  }

  async purgeActiveGuests(resetBranding?: boolean) {
    const active = await this.getActive();
    if (!active) throw new BadRequestException('No active event');
    await this.prisma.guest.deleteMany({ where: { eventId: active.id } });
    if (resetBranding) {
      await this.prisma.event.update({
        where: { id: active.id },
        data: {
          logoUrl: null,
          backgroundType: 'NONE',
          backgroundImageUrl: null,
          backgroundVideoUrl: null,
        },
      });
      await this.invalidateCache();
    }
    return { success: true };
  }
}
