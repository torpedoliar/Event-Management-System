import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class SouvenirsService {
    constructor(
        private prisma: PrismaService,
        private events: EventsService
    ) { }

    async list(eventId?: string) {
        const active = await this.events.getActive();
        const eid = eventId || active?.id;
        if (!eid) return [];
        const souvenirs = await this.prisma.souvenir.findMany({
            where: { eventId: eid },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { takes: true } },
                takes: {
                    include: { guest: { select: { id: true, name: true, guestId: true } } },
                    orderBy: { takenAt: 'desc' },
                    take: 10  // Only load last 10 for display, not all 10K+
                }
            }
        });
        // Transform to include taken count using _count (O(1) instead of loading all rows)
        return souvenirs.map((s: any) => ({
            ...s,
            takenCount: s._count.takes,
            remaining: s.quantity - s._count.takes
        }));
    }

    async getStats() {
        const active = await this.events.getActive();
        if (!active) return { totalSouvenirs: 0, totalQuantity: 0, totalTaken: 0, totalRemaining: 0, souvenirs: [] };

        // Use optimized query with _count instead of loading all takes
        const souvenirs = await this.prisma.souvenir.findMany({
            where: { eventId: active.id },
            select: {
                id: true,
                name: true,
                quantity: true,
                _count: {
                    select: { takes: true }
                }
            }
        });

        const souvenirStats = souvenirs.map(s => ({
            id: s.id,
            name: s.name,
            quantity: s.quantity,
            taken: s._count.takes,
            remaining: s.quantity - s._count.takes
        }));

        const totalQuantity = souvenirs.reduce((sum, s) => sum + s.quantity, 0);
        const totalTaken = souvenirs.reduce((sum, s) => sum + s._count.takes, 0);

        return {
            totalSouvenirs: souvenirs.length,
            totalQuantity,
            totalTaken,
            totalRemaining: totalQuantity - totalTaken,
            souvenirs: souvenirStats
        };
    }

    async create(data: {
        name: string;
        quantity: number;
        description?: string;
        imageUrl?: string;
    }) {
        const active = await this.events.getActive();
        if (!active) throw new BadRequestException('No active event');
        return this.prisma.souvenir.create({
            data: {
                name: data.name,
                quantity: data.quantity,
                description: data.description,
                imageUrl: data.imageUrl,
                eventId: active.id
            }
        });
    }

    async update(id: string, data: {
        name?: string;
        quantity?: number;
        description?: string;
        imageUrl?: string;
    }) {
        return this.prisma.souvenir.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.prisma.souvenir.delete({ where: { id } });
    }

    async giveSouvenir(guestId: string, souvenirId: string, takenById?: string, takenByName?: string) {
        // Run independent queries in parallel for speed
        const [activeEvent, guest, souvenir] = await Promise.all([
            this.events.getActive(),
            this.prisma.guest.findUnique({
                where: { id: guestId },
                include: {
                    souvenirTakes: {
                        include: { souvenir: true },
                        orderBy: { takenAt: 'desc' }
                    },
                    prizeWins: {
                        include: { collection: true }
                    }
                }
            }),
            this.prisma.souvenir.findUnique({
                where: { id: souvenirId },
                include: { _count: { select: { takes: true } } }
            })
        ]);

        const requireCheckin = activeEvent?.requireCheckinForSouvenir ?? true;

        if (!guest) throw new BadRequestException('Tamu tidak ditemukan');
        if (!souvenir) throw new BadRequestException('Souvenir not found');
        if (souvenir._count.takes >= souvenir.quantity) {
            throw new BadRequestException('Souvenir sudah habis');
        }

        // Check if guest has uncollected prizes
        const hasUncollectedPrizes = guest.prizeWins.some(pw => !pw.collection);

        // If guest has prizes, don't require check-in (they need to collect prizes first)
        // If guest only has souvenir, auto check-in if not checked in yet
        if (requireCheckin && !guest.checkedIn && !hasUncollectedPrizes) {
            // Auto check-in for souvenir-only guests
            await this.prisma.guest.update({
                where: { id: guestId },
                data: {
                    checkedIn: true,
                    checkedInAt: new Date(),
                    checkedInById: takenById,
                    checkedInByName: takenByName,
                    checkinCount: { increment: 1 }
                }
            });
            // Also create check-in record
            await this.prisma.guestCheckin.create({
                data: {
                    guestId,
                    checkinById: takenById,
                    checkinByName: takenByName,
                    counterName: 'Souvenir Counter'
                }
            });
        }

        // Check if guest already took this souvenir
        const existing = await this.prisma.souvenirTake.findUnique({
            where: { guestId_souvenirId: { guestId, souvenirId } }
        });
        if (existing) {
            // Return existing takes info for the popup
            throw new BadRequestException({
                message: 'Tamu sudah mengambil souvenir ini',
                alreadyTaken: true,
                previousTakes: guest.souvenirTakes.map(t => ({
                    souvenirName: t.souvenir.name,
                    takenAt: t.takenAt,
                    takenByName: t.takenByName
                }))
            });
        }

        // Create souvenir take record
        const take = await this.prisma.souvenirTake.create({
            data: { guestId, souvenirId, takenById, takenByName },
            include: { guest: true, souvenir: true }
        });

        // Update guest souvenirTaken flag
        await this.prisma.guest.update({
            where: { id: guestId },
            data: { souvenirTaken: true }
        });

        return take;
    }

    async removeSouvenirTake(guestId: string, souvenirId: string) {
        await this.prisma.souvenirTake.delete({
            where: { guestId_souvenirId: { guestId, souvenirId } }
        });

        // Check if guest has any other souvenir takes
        const remainingTakes = await this.prisma.souvenirTake.count({
            where: { guestId }
        });

        // Update guest souvenirTaken flag if no more takes
        if (remainingTakes === 0) {
            await this.prisma.guest.update({
                where: { id: guestId },
                data: { souvenirTaken: false }
            });
        }

        return { success: true };
    }

    async getGuestSouvenirTakes(guestId: string) {
        return this.prisma.souvenirTake.findMany({
            where: { guestId },
            include: { souvenir: true }
        });
    }

    async reset(souvenirId: string) {
        // Get affected guest IDs before deleting
        const affectedTakes = await this.prisma.souvenirTake.findMany({
            where: { souvenirId },
            select: { guestId: true }
        });
        const affectedGuestIds = [...new Set(affectedTakes.map(t => t.guestId))];

        // Remove all takes for this souvenir
        await this.prisma.souvenirTake.deleteMany({
            where: { souvenirId }
        });

        // Update souvenirTaken flag for affected guests who have no remaining takes
        for (const gid of affectedGuestIds) {
            const remainingTakes = await this.prisma.souvenirTake.count({ where: { guestId: gid } });
            if (remainingTakes === 0) {
                await this.prisma.guest.update({
                    where: { id: gid },
                    data: { souvenirTaken: false }
                });
            }
        }

        return { success: true };
    }

    // Prize collection methods for lucky draw winners
    async getGuestPrizeWins(guestId: string) {
        return this.prisma.prizeWinner.findMany({
            where: { guestId },
            include: {
                prize: true,
                collection: true
            },
            orderBy: { wonAt: 'asc' }
        });
    }

    async collectPrize(prizeWinnerId: string, collectedById?: string, collectedByName?: string) {
        // Check if prize winner exists
        const prizeWinner = await this.prisma.prizeWinner.findUnique({
            where: { id: prizeWinnerId },
            include: { collection: true }
        });
        if (!prizeWinner) throw new BadRequestException('Prize winner record not found');
        if (prizeWinner.collection) {
            throw new BadRequestException('Hadiah ini sudah diambil');
        }

        // Create collection record
        return this.prisma.prizeCollection.create({
            data: {
                prizeWinnerId,
                collectedById,
                collectedByName
            },
            include: {
                prizeWinner: {
                    include: { guest: true, prize: true }
                }
            }
        });
    }

    async uncollectPrize(prizeWinnerId: string) {
        await this.prisma.prizeCollection.delete({
            where: { prizeWinnerId }
        });
        return { success: true };
    }

    // Get all prize winners with collection status
    async getAllPrizeWinners() {
        const active = await this.events.getActive();
        if (!active) return [];

        return this.prisma.prizeWinner.findMany({
            where: {
                prize: { eventId: active.id }
            },
            include: {
                guest: true,
                prize: true,
                collection: true
            },
            orderBy: { wonAt: 'desc' }
        });
    }

    // Get uncollected prizes
    async getUncollectedPrizes() {
        const active = await this.events.getActive();
        if (!active) return [];

        return this.prisma.prizeWinner.findMany({
            where: {
                prize: { eventId: active.id },
                collection: null
            },
            include: {
                guest: true,
                prize: true
            },
            orderBy: { wonAt: 'asc' }
        });
    }

    // Create guest and give souvenir in one operation
    async createGuestAndGiveSouvenir(
        guestIdOrName: string,
        souvenirId: string,
        takenById?: string,
        takenByName?: string
    ) {
        const active = await this.events.getActive();
        if (!active) throw new BadRequestException('No active event');

        // Check if souvenir exists and has stock
        const souvenir = await this.prisma.souvenir.findUnique({
            where: { id: souvenirId },
            include: { takes: true }
        });
        if (!souvenir) throw new BadRequestException('Souvenir tidak ditemukan');
        if (souvenir.takes.length >= souvenir.quantity) {
            throw new BadRequestException('Souvenir sudah habis');
        }

        // Determine if input is guest ID or name
        const isLikelyId = /^[A-Z0-9\-_]+$/i.test(guestIdOrName.trim()) && guestIdOrName.length <= 50;

        // Create the guest with the input as both ID and name, or just name
        const guestId = isLikelyId ? guestIdOrName.trim() : `GUEST-${Date.now()}`;
        const guestName = guestIdOrName.trim();

        // Get max queue number
        const lastGuest = await this.prisma.guest.findFirst({
            where: { eventId: active.id },
            orderBy: { queueNumber: 'desc' },
            select: { queueNumber: true }
        });
        const nextQueue = (lastGuest?.queueNumber || 0) + 1;

        // Create guest
        const guest = await this.prisma.guest.create({
            data: {
                guestId,
                name: guestName,
                tableLocation: '-',
                queueNumber: nextQueue,
                eventId: active.id,
                registrationSource: 'WALKIN',
                checkedIn: true,
                checkedInAt: new Date(),
                checkedInById: takenById,
                checkedInByName: takenByName,
                checkinCount: 1,
                souvenirTaken: true
            }
        });

        // Create check-in record for data consistency
        await this.prisma.guestCheckin.create({
            data: {
                guestId: guest.id,
                checkinById: takenById || null,
                checkinByName: takenByName || null,
                counterName: 'Souvenir Counter',
            }
        });

        // Create souvenir take record
        const take = await this.prisma.souvenirTake.create({
            data: {
                guestId: guest.id,
                souvenirId,
                takenById,
                takenByName
            },
            include: { guest: true, souvenir: true }
        });

        return { guest, take };
    }
}
