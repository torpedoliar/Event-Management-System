import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GuestsService } from '../guests/guests.service';
import { UpdateRegistrationConfigDto } from './dto/update-registration-config.dto';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';

const VALID_FIELD_KEYS = ['name', 'guestId', 'email', 'phone', 'company', 'department', 'division', 'tableLocation', 'notes'];

interface RegistrationField {
  key: string;
  label: string;
  required: boolean;
  type: string;
  placeholder?: string;
}

@Injectable()
export class PublicRegistrationService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private guests: GuestsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getActiveEventId(): Promise<string> {
    const event = await this.events.getActive();
    if (!event) throw new NotFoundException('No active event');
    return event.id;
  }

  private async getActiveEventIdForPublic(): Promise<string> {
    const event = await this.events.getActive();
    if (!event) throw new NotFoundException('No active event');
    // Query DB directly to avoid stale Redis cache — admin may have just toggled the flag
    const freshEvent = await this.prisma.event.findUnique({
      where: { id: event.id },
      select: { enablePublicRegistration: true },
    });
    if (!freshEvent?.enablePublicRegistration) {
      throw new BadRequestException('Public registration is not enabled');
    }
    return event.id;
  }

  private async getOrCreateConfig(eventId: string) {
    let config = await this.prisma.publicRegistrationConfig.findUnique({
      where: { eventId },
    });
    if (!config) {
      config = await this.prisma.publicRegistrationConfig.create({
        data: {
          eventId,
          fields: [
            { key: 'name', label: 'Nama Lengkap', required: true, type: 'text', placeholder: 'Nama lengkap Anda' },
          ] as any,
        },
      });
    }
    return config;
  }

  private isRegistrationOpen(config: any): { open: boolean; reason?: string } {
    if (!config.isActive) return { open: false, reason: 'closed' };
    const now = new Date();
    if (config.openAt && now < new Date(config.openAt)) return { open: false, reason: 'closed' };
    if (config.closeAt && now > new Date(config.closeAt)) return { open: false, reason: 'closed' };
    return { open: true };
  }

  private async countPublicRegistrants(eventId: string): Promise<number> {
    return this.prisma.guest.count({
      where: { eventId, registrationSource: 'PUBLIC' },
    });
  }

  // Public: get config for rendering the form (no sensitive data)
  async getPublicConfig() {
    const eventId = await this.getActiveEventIdForPublic();
    const config = await this.getOrCreateConfig(eventId);
    const currentCount = await this.countPublicRegistrants(eventId);
    const { open, reason } = this.isRegistrationOpen(config);
    const isFull = config.maxQuota > 0 && currentCount >= config.maxQuota;

    return {
      isActive: config.isActive,
      isOpen: open,
      reason: !open ? reason : (isFull ? 'full' : null),
      maxQuota: config.maxQuota,
      currentCount,
      remainingQuota: config.maxQuota > 0 ? Math.max(0, config.maxQuota - currentCount) : null,
      fields: (config.fields as any[]) || [],
      title: config.title,
      description: config.description,
      successMessage: config.successMessage,
      closedMessage: config.closedMessage,
      fullMessage: config.fullMessage,
    };
  }

  // Admin: get full config
  async getAdminConfig() {
    const eventId = await this.getActiveEventId();
    return this.getOrCreateConfig(eventId);
  }

  // Admin: update config
  async updateConfig(dto: UpdateRegistrationConfigDto) {
    const eventId = await this.getActiveEventId();
    await this.getOrCreateConfig(eventId);

    const data: any = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.maxQuota !== undefined) data.maxQuota = dto.maxQuota;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.successMessage !== undefined) data.successMessage = dto.successMessage;
    if (dto.closedMessage !== undefined) data.closedMessage = dto.closedMessage;
    if (dto.fullMessage !== undefined) data.fullMessage = dto.fullMessage;
    if (dto.preventDuplicates !== undefined) data.preventDuplicates = dto.preventDuplicates;
    if (dto.guestIdPrefix !== undefined) data.guestIdPrefix = dto.guestIdPrefix;

    if (dto.openAt !== undefined) {
      data.openAt = dto.openAt === null || dto.openAt === '' ? null : new Date(dto.openAt);
    }
    if (dto.closeAt !== undefined) {
      data.closeAt = dto.closeAt === null || dto.closeAt === '' ? null : new Date(dto.closeAt);
    }

    if (dto.fields !== undefined) {
      for (const field of dto.fields) {
        if (!VALID_FIELD_KEYS.includes(field.key)) {
          throw new BadRequestException(`Field key "${field.key}" is not valid. Valid keys: ${VALID_FIELD_KEYS.join(', ')}`);
        }
        if (field.type !== 'text' && field.type !== 'textarea') {
          throw new BadRequestException(`Field type must be 'text' or 'textarea'`);
        }
      }
      // Ensure 'name' field is always present and required
      if (!dto.fields.some(f => f.key === 'name')) {
        dto.fields.unshift({ key: 'name', label: 'Nama Lengkap', required: true, type: 'text' } as any);
      }
      dto.fields = dto.fields.map(f => f.key === 'name' ? { ...f, required: true } : f);
      data.fields = dto.fields as any;
    }

    return this.prisma.publicRegistrationConfig.update({
      where: { eventId },
      data,
    });
  }

  // Public: submit a registration
  async submitRegistration(dto: SubmitRegistrationDto) {
    // Honeypot: if website field filled, silently reject (bot)
    if (dto.website) {
      return { success: true, message: 'Terima kasih!', guestId: null, queueNumber: null };
    }

    const eventId = await this.getActiveEventIdForPublic();
    const config = await this.getOrCreateConfig(eventId);

    const { open } = this.isRegistrationOpen(config);
    if (!open) throw new BadRequestException(config.closedMessage);

    if (config.maxQuota > 0) {
      const currentCount = await this.countPublicRegistrants(eventId);
      if (currentCount >= config.maxQuota) throw new BadRequestException(config.fullMessage);
    }

    const fields = (config.fields as unknown as RegistrationField[]) || [];
    const input: any = {};
    for (const field of fields) {
      const value = (dto.data?.[field.key] ?? '').trim();
      if (field.required && !value) {
        throw new BadRequestException(`Field "${field.label}" wajib diisi`);
      }
      if (value) input[field.key] = value;
    }
    if (!input.name) throw new BadRequestException('Nama wajib diisi');

    // Auto-generate guestId if not provided via form
    const needsAutoGuestId = !fields.some(f => f.key === 'guestId') || !input.guestId;
    if (needsAutoGuestId) {
      const queueNumber = await this.guests.nextQueueNumber(eventId);
      input.guestId = `${config.guestIdPrefix}-${queueNumber}`;
      input.queueNumber = queueNumber;
    }

    // Check duplicates if enabled
    if (config.preventDuplicates) {
      const conditions: any[] = [];
      for (const field of fields) {
        if (input[field.key]) conditions.push({ [field.key]: input[field.key] });
      }
      if (conditions.length > 0) {
        const existing = await this.prisma.guest.findFirst({ where: { eventId, OR: conditions } });
        if (existing) throw new ConflictException('Anda sudah terdaftar dengan data yang sama');
      }
    }

    // Create guest via existing GuestsService (reuses queue number, table default, etc.)
    const guest = await this.guests.create(input, undefined, true, 'PUBLIC');

    return {
      success: true,
      message: config.successMessage,
      guestId: guest.guestId,
      queueNumber: guest.queueNumber,
    };
  }

  // Admin: get registration stats
  async getStats() {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);
    const currentCount = await this.countPublicRegistrants(eventId);
    const { open } = this.isRegistrationOpen(config);
    return {
      isActive: config.isActive,
      isOpen: open,
      maxQuota: config.maxQuota,
      currentCount,
      remainingQuota: config.maxQuota > 0 ? Math.max(0, config.maxQuota - currentCount) : null,
      isFull: config.maxQuota > 0 && currentCount >= config.maxQuota,
    };
  }
}
