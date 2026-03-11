import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditAction } from '../common/audit/audit.service';
import { CreateGuestDto, BulkDeleteGuestsDto, BulkUpdateGuestsDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { Guest, Prisma, GuestCategory } from '@prisma/client';

@Injectable()
export class GuestsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) { }

  async getActiveEventId(): Promise<string | null> {
    const active = await this.prisma.event.findFirst({ where: { isActive: true } });
    return active ? active.id : null;
  }

  async getActiveEvent() {
    return this.prisma.event.findFirst({ where: { isActive: true } });
  }

  async getEventById(id: string) {
    return this.prisma.event.findUnique({ where: { id } });
  }

  private buildWhere(query: QueryGuestsDto): Prisma.GuestWhereInput {
    const where: Prisma.GuestWhereInput = {};
    if (query.eventId) where.eventId = query.eventId;
    if (query.q) {
      const searchConditions: Prisma.GuestWhereInput[] = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { guestId: { contains: query.q, mode: 'insensitive' } },
        { tableLocation: { contains: query.q, mode: 'insensitive' } },
        { company: { contains: query.q, mode: 'insensitive' } },
        { department: { contains: query.q, mode: 'insensitive' } },
        { division: { contains: query.q, mode: 'insensitive' } },
        { notes: { contains: query.q, mode: 'insensitive' } },
      ];
      // Check if search term matches a category
      const upperQ = query.q.toUpperCase();
      if (Object.values(GuestCategory).includes(upperQ as GuestCategory)) {
        searchConditions.push({ category: upperQ as GuestCategory });
      }
      where.OR = searchConditions;
    }
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query.guestId) where.guestId = { contains: query.guestId, mode: 'insensitive' };
    if (query.table) where.tableLocation = { contains: query.table, mode: 'insensitive' };
    if (typeof query.checkedIn !== 'undefined') {
      if (query.checkedIn === 'true') where.checkedIn = true;
      if (query.checkedIn === 'false') where.checkedIn = false;
    }
    return where;
  }

  async list(query: QueryGuestsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    // Auto-filter by active event if no eventId provided
    if (!query.eventId) {
      const activeEventId = await this.getActiveEventId();
      if (activeEventId) query.eventId = activeEventId;
    }

    const where = this.buildWhere(query);

    const [total, data] = await this.prisma.$transaction([
      this.prisma.guest.count({ where }),
      this.prisma.guest.findMany({
        where,
        orderBy: [{ queueNumber: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          prizeWins: {
            include: {
              prize: true,
              collection: true
            }
          },
          souvenirTakes: {
            include: { souvenir: true }
          },
          checkins: {
            orderBy: { checkinAt: 'asc' }
          }
        },
      }),
    ]);

    return { total, data };
  }

  async listWithFullRelations(query: QueryGuestsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    // Auto-filter by active event if no eventId provided
    if (!query.eventId) {
      const activeEventId = await this.getActiveEventId();
      if (activeEventId) query.eventId = activeEventId;
    }

    const where = this.buildWhere(query);

    const [total, data] = await this.prisma.$transaction([
      this.prisma.guest.count({ where }),
      this.prisma.guest.findMany({
        where,
        orderBy: [{ queueNumber: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          prizeWins: {
            include: {
              prize: true,
              collection: true
            }
          },
          souvenirTakes: {
            include: { souvenir: true }
          },
          checkins: {
            orderBy: { checkinAt: 'asc' }
          }
        },
      }),
    ]);

    return { total, data };
  }

  // Cursor-based pagination for better performance with large datasets
  async listCursor(query: QueryGuestsDto) {
    const limit = query.limit ?? 20;
    const cursor = query.cursor;
    const sortBy = query.sortBy ?? 'queueNumber';
    const sortOrder = query.sortOrder ?? 'asc';

    // Auto-filter by active event if no eventId provided
    if (!query.eventId) {
      const activeEventId = await this.getActiveEventId();
      if (activeEventId) query.eventId = activeEventId;
    }

    const where = this.buildWhere(query);

    // Build orderBy dynamically
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // If cursor provided, add cursor condition
    const cursorCondition = cursor ? { id: cursor } : undefined;

    const data = await this.prisma.guest.findMany({
      where,
      orderBy: [orderBy, { id: 'asc' }],
      take: limit + 1, // Fetch one extra to determine if there's more
      ...(cursorCondition && {
        cursor: cursorCondition,
        skip: 1, // Skip the cursor item itself
      }),
      include: {
        prizeWins: { include: { prize: true } },
      },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, -1) : data;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;
    const prevCursor = cursor || null;

    // Get total count (cached or computed)
    const total = await this.prisma.guest.count({ where });

    return {
      data: items,
      pagination: {
        total,
        hasMore,
        nextCursor,
        prevCursor,
        limit,
      },
    };
  }

  async create(input: CreateGuestDto, photoUrl?: string, skipDuplicateCheck?: boolean, registrationSource?: 'MANUAL' | 'IMPORT' | 'WALKIN') {
    let eventId = input.eventId;
    if (!eventId) {
      const activeId = await this.getActiveEventId();
      if (!activeId) throw new NotFoundException('No active event');
      eventId = activeId;
    }

    // Check if duplicate guest ID is allowed
    if (!skipDuplicateCheck) {
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event?.allowDuplicateGuestId) {
        // Check for existing guest with same guestId
        const existing = await this.prisma.guest.findFirst({
          where: { eventId, guestId: input.guestId },
        });
        if (existing) {
          throw new ConflictException(`Guest ID "${input.guestId}" sudah digunakan`);
        }
      }
    }

    // assign next queue number if not provided
    const queueNumber = input.queueNumber ?? (await this.nextQueueNumber(eventId));

    return this.prisma.guest.create({
      data: {
        eventId,
        queueNumber,
        guestId: input.guestId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        photoUrl: photoUrl ?? input.photoUrl ?? undefined,
        tableLocation: input.tableLocation || '-',
        company: input.company,
        department: input.department,
        division: input.division,
        notes: input.notes,
        category: input.category as GuestCategory || 'REGULAR',
        registrationSource: registrationSource || 'MANUAL',
        checkedIn: input.checkedIn ?? false,
        checkedInAt: input.checkedInAt ? new Date(input.checkedInAt) : undefined,
      },
    });
  }

  async nextQueueNumber(eventId: string): Promise<number> {
    const lastGuest = await this.prisma.guest.findFirst({
      where: { eventId },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true }
    });
    return (lastGuest?.queueNumber ?? 0) + 1;
  }

  async bulkCreate(guests: Omit<Prisma.GuestCreateManyInput, 'queueNumber' | 'eventId'>[], eventId: string) {
    if (!guests.length) return 0;

    // Get the sequence starting point once
    let currentQueue = await this.nextQueueNumber(eventId);

    // Assign queue numbers in-memory
    const dataToInsert = guests.map(g => ({
      ...g,
      eventId,
      queueNumber: currentQueue++,
      registrationSource: g.registrationSource || 'IMPORT',
      checkedIn: false
    }));

    // Chunk size of 1000 is safe for most databases to avoid statement size limits
    const chunkSize = 1000;
    let totalCreated = 0;

    for (let i = 0; i < dataToInsert.length; i += chunkSize) {
      const chunk = dataToInsert.slice(i, i + chunkSize);
      const result = await this.prisma.guest.createMany({
        data: chunk,
        skipDuplicates: true
      });
      totalCreated += result.count;
    }

    return totalCreated;
  }

  async getById(id: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id } });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async update(id: string, input: UpdateGuestDto, photoUrl?: string) {
    await this.getById(id);
    const data: Prisma.GuestUpdateInput = { ...input };
    if (typeof photoUrl !== 'undefined') data.photoUrl = photoUrl;
    if (typeof input.checkedInAt === 'string') data.checkedInAt = new Date(input.checkedInAt);
    return this.prisma.guest.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.guest.delete({ where: { id } });
    return { success: true };
  }

  async checkIn(id: string, adminId?: string, adminName?: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: { event: true, checkins: true }
    });
    if (!guest) throw new NotFoundException('Guest not found');

    const now = new Date();
    const event = guest.event;
    const allowMultiple = event?.allowMultipleCheckin ?? false;
    const maxCheckins = event?.maxCheckinCount ?? 1;
    const allowMultiplePerCounter = event?.allowMultipleCheckinPerCounter ?? false;

    // Debug logging
    console.log(`[CheckIn] Guest: ${guest.name}, AdminId: ${adminId}, AdminName: ${adminName}`);
    console.log(`[CheckIn] Settings - allowMultiplePerCounter: ${allowMultiplePerCounter}, allowMultiple: ${allowMultiple}, maxCheckins: ${maxCheckins}`);
    console.log(`[CheckIn] Guest checkedIn: ${guest.checkedIn}, checkinCount: ${guest.checkinCount}`);
    console.log(`[CheckIn] Existing checkins:`, guest.checkins.map(c => ({ id: c.checkinById, name: c.checkinByName })));

    // Check if this admin already checked in this guest (only if adminId is provided)
    const existingCheckinByAdmin = adminId
      ? guest.checkins.find(c => c.checkinById === adminId)
      : null;

    console.log(`[CheckIn] existingCheckinByAdmin:`, existingCheckinByAdmin ? 'YES' : 'NO');

    if (guest.checkedIn) {
      // MODE 1: Per-Counter mode (allowMultiplePerCounter = true)
      // Allow unlimited total check-ins, but only 1 per admin/counter
      if (allowMultiplePerCounter) {
        console.log(`[CheckIn] Using Per-Counter mode`);

        // Require login for per-counter mode
        if (!adminId) {
          const guestWithHistory = await this.prisma.guest.findUnique({
            where: { id },
            include: { checkins: { orderBy: { checkinAt: 'asc' } } }
          });
          throw new ConflictException({
            ...guestWithHistory,
            requireLogin: true,
            message: `Login diperlukan untuk mode Multiple Check-in Per Counter`
          });
        }

        // Check if THIS specific admin has already checked in
        if (existingCheckinByAdmin) {
          console.log(`[CheckIn] BLOCKED - Admin ${adminName} (${adminId}) already checked in this guest`);
          const guestWithHistory = await this.prisma.guest.findUnique({
            where: { id },
            include: { checkins: { orderBy: { checkinAt: 'asc' } } }
          });
          throw new ConflictException({
            ...guestWithHistory,
            alreadyCheckedByThisAdmin: true,
            message: `${adminName || 'Admin ini'} sudah pernah check-in tamu ini`
          });
        }

        // ALLOW - this admin hasn't checked in yet
        console.log(`[CheckIn] ALLOWED - Admin ${adminName} (${adminId}) can check in`);

        // MODE 2: No multiple check-in allowed  
      } else if (!allowMultiple) {
        console.log(`[CheckIn] BLOCKED - Multiple check-in not allowed`);
        const guestWithHistory = await this.prisma.guest.findUnique({
          where: { id },
          include: { checkins: { orderBy: { checkinAt: 'asc' } } }
        });
        throw new ConflictException(guestWithHistory);

        // MODE 3: Regular multiple check-in with maxCheckinCount limit
      } else {
        console.log(`[CheckIn] Using Regular Multiple mode with max ${maxCheckins}`);

        // Check if already checked in by this admin (only if adminId provided)
        if (adminId && existingCheckinByAdmin) {
          console.log(`[CheckIn] BLOCKED - Admin already checked in`);
          const guestWithHistory = await this.prisma.guest.findUnique({
            where: { id },
            include: { checkins: { orderBy: { checkinAt: 'asc' } } }
          });
          throw new ConflictException({
            ...guestWithHistory,
            alreadyCheckedByThisAdmin: true,
            message: `${adminName || 'Admin ini'} sudah pernah check-in tamu ini`
          });
        }

        // Check if max check-ins reached
        if (guest.checkinCount >= maxCheckins) {
          console.log(`[CheckIn] BLOCKED - Max check-ins reached (${guest.checkinCount}/${maxCheckins})`);
          const guestWithHistory = await this.prisma.guest.findUnique({
            where: { id },
            include: { checkins: { orderBy: { checkinAt: 'asc' } } }
          });
          throw new ConflictException({
            ...guestWithHistory,
            maxReached: true,
            message: `Sudah mencapai maksimum ${maxCheckins}x check-in`
          });
        }
      }
    }

    // Perform check-in and return updated guest in one transaction
    const [newCheckin, updatedGuest] = await this.prisma.$transaction(async (tx) => {
      // Create check-in record
      const checkin = await tx.guestCheckin.create({
        data: {
          guestId: id,
          checkinById: adminId || null,
          checkinByName: adminName || null,
          checkinAt: now,
        }
      });

      // Update guest
      const updated = await tx.guest.update({
        where: { id },
        data: {
          checkedIn: true,
          checkedInAt: guest.checkedInAt || now, // Keep first check-in time
          checkedInById: guest.checkedInById || adminId || null, // Keep first admin
          checkedInByName: guest.checkedInByName || adminName || null,
          checkinCount: { increment: 1 },
        },
      });

      return [checkin, updated];
    });

    // Build response in-memory — avoid extra findUnique query
    const allCheckins = [...guest.checkins, newCheckin].sort(
      (a, b) => new Date(a.checkinAt).getTime() - new Date(b.checkinAt).getTime()
    );
    return { ...updatedGuest, checkins: allCheckins };
  }

  async uncheckIn(id: string, adminId?: string, adminName?: string, reason?: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: { checkins: true }
    });
    if (!guest) throw new NotFoundException('Guest not found');

    // Store original check-in info for audit
    const originalCheckinAt = guest.checkedInAt;
    const originalCheckinBy = guest.checkedInByName;
    const checkinHistory = guest.checkins.map(c => ({
      admin: c.checkinByName,
      at: c.checkinAt.toISOString()
    }));

    // Delete all check-in records and reset guest
    await this.prisma.$transaction(async (tx) => {
      await tx.guestCheckin.deleteMany({ where: { guestId: id } });
      await tx.guest.update({
        where: { id },
        data: {
          checkedIn: false,
          checkedInAt: null,
          checkedInById: null,
          checkedInByName: null,
          checkinCount: 0,
        },
      });
    });

    // Log audit with detailed info
    await this.audit.log({
      action: AuditAction.GUEST_UNCHECKIN,
      adminUserId: adminId,
      adminUsername: adminName,
      targetType: 'Guest',
      targetId: guest.id,
      targetName: guest.name,
      metadata: {
        guestId: guest.guestId,
        guestName: guest.name,
        reason: reason || 'No reason provided',
        originalCheckinAt: originalCheckinAt?.toISOString(),
        originalCheckinBy,
        checkinHistory,
        uncheckinAt: new Date().toISOString(),
        uncheckinBy: adminName,
        warning: 'Tamu ini tidak akan eligible untuk lucky draw sampai check-in ulang',
      },
    });

    return this.prisma.guest.findUnique({ where: { id } });
  }

  async stats(eventId?: string) {
    let eId = eventId;
    if (!eId) {
      const activeId = await this.getActiveEventId();
      if (!activeId) return { total: 0, checkedIn: 0, notCheckedIn: 0 };
      eId = activeId;
    }
    const [total, checkedIn] = await this.prisma.$transaction([
      this.prisma.guest.count({ where: { eventId: eId } }),
      this.prisma.guest.count({ where: { eventId: eId, checkedIn: true } }),
    ]);
    return { total, checkedIn, notCheckedIn: total - checkedIn };
  }

  async publicSearch(params: { guestId?: string; name?: string; exact?: boolean }) {
    const eventId = await this.getActiveEventId();
    if (!eventId) return [];
    const qId = params.guestId?.trim();
    const qName = params.name?.trim();
    const exactMatchOnly = params.exact === true;

    // Check if duplicate guest IDs are allowed
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    const allowDuplicates = event?.allowDuplicateGuestId ?? false;

    // If exact match is enforced (e.g. from a QR Scanner), skip fuzzy search
    if (exactMatchOnly && qId) {
      // Allow exact match on internal UUID or guestId (case-insensitive)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qId);
      const exacts = await this.prisma.guest.findMany({
        where: {
          eventId,
          OR: [
            { guestId: { equals: qId, mode: 'insensitive' } },
            ...(isUuid ? [{ id: qId }] : [])
          ]
        },
        orderBy: [{ queueNumber: 'asc' }]
      });
      return exacts;
    }

    // If duplicates allowed, always return all matches for selection
    if (allowDuplicates) {
      const or: Prisma.GuestWhereInput[] = [];
      if (qId) or.push({ guestId: { equals: qId, mode: 'insensitive' } });
      if (qId) or.push({ guestId: { contains: qId, mode: 'insensitive' } });
      if (qName) or.push({ name: { contains: qName, mode: 'insensitive' } });
      const where: Prisma.GuestWhereInput = { eventId, ...(or.length ? { OR: or } : {}) };
      return this.prisma.guest.findMany({ where, orderBy: [{ queueNumber: 'asc' }] });
    }

    // Original behavior: prioritize exact ID match
    if (qId) {
      const exact = await this.prisma.guest.findFirst({ where: { eventId, guestId: qId } });
      if (exact) return [exact];
    }

    // Fallback: gunakan OR agar bisa cocok oleh ID ATAU nama (contains, case-insensitive)
    const or: Prisma.GuestWhereInput[] = [];
    if (qId) or.push({ guestId: { contains: qId, mode: 'insensitive' } });
    if (qName) or.push({ name: { contains: qName, mode: 'insensitive' } });
    const where: Prisma.GuestWhereInput = { eventId, ...(or.length ? { OR: or } : {}) };
    return this.prisma.guest.findMany({ where, orderBy: [{ queueNumber: 'asc' }] });
  }

  async checkInByGuestId(guestId: string, adminId?: string, adminName?: string) {
    const eventId = await this.getActiveEventId();
    if (!eventId) throw new NotFoundException('No active event');
    // Find guest with minimal query — checkIn() will handle the rest
    const guest = await this.prisma.guest.findFirst({ where: { eventId, guestId }, select: { id: true } });
    if (!guest) throw new NotFoundException('Guest not found');
    return this.checkIn(guest.id, adminId, adminName);
  }

  async checkInByQr(qrCode: string, adminId?: string, adminName?: string) {
    try {
      const eventId = await this.getActiveEventId();
      if (!eventId) throw new NotFoundException('No active event');
      let guestId: string | null = null;

      // Check if qrCode is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrCode);

      if (isUuid) {
        // Try to find by internal ID first (UUID) — select only id to minimize data
        const byId = await this.prisma.guest.findUnique({ where: { id: qrCode }, select: { id: true, eventId: true } });
        if (byId && byId.eventId === eventId) guestId = byId.id;
      }

      // If not found or event mismatch, try by guestId (string)
      if (!guestId) {
        const byGuestId = await this.prisma.guest.findFirst({ where: { eventId, guestId: qrCode }, select: { id: true } });
        if (byGuestId) guestId = byGuestId.id;
      }

      if (!guestId) throw new NotFoundException('Guest not found');

      // checkIn() loads guest with includes internally — no double lookup
      return this.checkIn(guestId, adminId, adminName);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new NotFoundException("Gagal memproses QR Code. Pastikan QR valid.");
    }
  }

  async publicHistory(limit = 20) {
    const eventId = await this.getActiveEventId();
    if (!eventId) return [];
    return this.prisma.guest.findMany({
      where: { eventId, checkedIn: true },
      orderBy: [{ checkedInAt: 'desc' }],
      take: limit,
    });
  }
  async companyStats(eventId?: string) {
    let eId = eventId;
    if (!eId) {
      const activeId = await this.getActiveEventId();
      if (!activeId) return [];
      eId = activeId;
    }

    // Get all guests grouped by company
    const allGuests = await this.prisma.guest.groupBy({
      by: ['company'],
      where: { eventId: eId },
      _count: { _all: true },
    });

    // Get checked-in guests grouped by company
    const checkedInGuests = await this.prisma.guest.groupBy({
      by: ['company'],
      where: { eventId: eId, checkedIn: true },
      _count: { _all: true },
    });

    // Merge results
    const stats = allGuests.map((group) => {
      const company = group.company || 'Umum/Lainnya';
      const total = group._count._all;
      const checkedInGroup = checkedInGuests.find((g) => g.company === group.company);
      const checkedIn = checkedInGroup ? checkedInGroup._count._all : 0;

      return {
        company,
        total,
        checkedIn,
        notCheckedIn: total - checkedIn,
      };
    });

    // Sort by total guests descending
    return stats.sort((a, b) => b.total - a.total);
  }

  async createAndCheckIn(guestIdOrName: string, adminId?: string, adminName?: string) {
    const eventId = await this.getActiveEventId();
    if (!eventId) throw new NotFoundException('No active event');

    // Determine if input is guest ID or name
    const isLikelyId = /^[A-Z0-9\-_]+$/i.test(guestIdOrName.trim()) && guestIdOrName.length <= 50;

    // Create the guest with the input as both ID and name, or just name
    const guestId = isLikelyId ? guestIdOrName.trim() : `GUEST-${Date.now()}`;
    const guestName = guestIdOrName.trim();

    // Get max queue number
    const queueNumber = await this.nextQueueNumber(eventId);

    const now = new Date();

    // Create guest and check-in in one operation (WALKIN = registered from check-in page)
    const created = await this.prisma.guest.create({
      data: {
        guestId,
        name: guestName,
        tableLocation: '-',
        queueNumber,
        eventId,
        registrationSource: 'WALKIN',
        checkedIn: true,
        checkedInAt: now,
        checkedInById: adminId || null,
        checkedInByName: adminName || null,
        checkinCount: 1,
      }
    });

    // Create check-in record for data consistency with normal check-in flow
    await this.prisma.guestCheckin.create({
      data: {
        guestId: created.id,
        checkinById: adminId || null,
        checkinByName: adminName || null,
        checkinAt: now,
      }
    });

    // Return fresh data from database to ensure all fields are properly populated
    return this.prisma.guest.findUnique({ where: { id: created.id } });
  }

  async bulkDelete(dto: BulkDeleteGuestsDto) {
    const { ids } = dto;
    if (!ids.length) return { deleted: 0 };

    const result = await this.prisma.guest.deleteMany({
      where: { id: { in: ids } },
    });

    return { deleted: result.count };
  }

  async bulkUpdate(dto: BulkUpdateGuestsDto) {
    const { ids, ...updateData } = dto;
    if (!ids.length) return { updated: 0 };

    // Remove undefined values
    const data: Prisma.GuestUpdateManyMutationInput = {};
    if (updateData.category !== undefined) data.category = updateData.category as GuestCategory;
    if (updateData.tableLocation !== undefined) data.tableLocation = updateData.tableLocation;
    if (updateData.company !== undefined) data.company = updateData.company;
    if (updateData.department !== undefined) data.department = updateData.department;
    if (updateData.division !== undefined) data.division = updateData.division;
    if (updateData.checkedIn !== undefined) {
      data.checkedIn = updateData.checkedIn;
      if (updateData.checkedIn) {
        data.checkedInAt = new Date();
        data.checkinCount = 1;
      } else {
        data.checkedInAt = null;
        data.checkinCount = 0;
      }
    }
    if (updateData.souvenirTaken !== undefined) data.souvenirTaken = updateData.souvenirTaken;

    const result = await this.prisma.guest.updateMany({
      where: { id: { in: ids } },
      data,
    });

    return { updated: result.count };
  }

  async checkDuplicates(guestIds: string[], names: string[], eventId?: string) {
    let eId = eventId;
    if (!eId) {
      const activeId = await this.getActiveEventId();
      if (!activeId) return { duplicateIds: [], duplicateNames: [] };
      eId = activeId;
    }

    // Check duplicate guest IDs
    const existingByIds = await this.prisma.guest.findMany({
      where: {
        eventId: eId,
        guestId: { in: guestIds },
      },
      select: { guestId: true, name: true },
    });

    // Check duplicate names (exact match, case-insensitive)
    const lowerNames = names.map(n => n.toLowerCase());
    const existingByNames = await this.prisma.guest.findMany({
      where: {
        eventId: eId,
      },
      select: { guestId: true, name: true },
    });

    const duplicateNames = existingByNames.filter(g =>
      lowerNames.includes(g.name.toLowerCase())
    );

    return {
      duplicateIds: existingByIds,
      duplicateNames: duplicateNames.filter(n =>
        !existingByIds.some(e => e.guestId === n.guestId)
      ),
    };
  }
}
