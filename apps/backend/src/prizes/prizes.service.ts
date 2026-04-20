import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class PrizesService {
    constructor(
        private prisma: PrismaService,
        private events: EventsService
    ) { }

    async list(eventId?: string) {
        const active = await this.events.getActive();
        const eid = eventId || active?.id;
        if (!eid) return [];
        const prizes = await this.prisma.prize.findMany({
            where: { eventId: eid },
            orderBy: { createdAt: 'asc' },
            include: {
                prizeWinners: {
                    include: { guest: true },
                    orderBy: { wonAt: 'asc' }
                }
            }
        });
        // Transform to include winners array for backward compatibility
        return prizes.map(p => ({
            ...p,
            winners: p.prizeWinners.map(pw => pw.guest)
        }));
    }

    async getEligibleGuests(params: {
        page: number;
        pageSize: number;
        q?: string;
        guestId?: string;
        tab?: 'all' | 'eligible' | 'won';
    }) {
        const active = await this.events.getActive();
        if (!active) return { data: [], total: 0, eligible: 0, won: 0, page: 1, pageSize: 50, totalPages: 1, totalCheckedIn: 0 };

        const { page, pageSize, q, guestId, tab } = params;

        // Base filter: tamu hadir di event aktif
        const baseWhere: any = {
            eventId: active.id,
            checkedIn: true,
        };

        // Search filters (OR condition)
        const searchConditions: any[] = [];
        if (q) {
            searchConditions.push(
                { name: { contains: q, mode: 'insensitive' } },
                { company: { contains: q, mode: 'insensitive' } },
                { division: { contains: q, mode: 'insensitive' } },
            );
            // Check jika q adalah angka → cari queueNumber
            if (!isNaN(Number(q))) {
                searchConditions.push({ queueNumber: parseInt(q) });
            }
        }
        if (guestId) {
            searchConditions.push(
                { guestId: { contains: guestId, mode: 'insensitive' } },
            );
        }
        if (searchConditions.length > 0) {
            baseWhere.OR = searchConditions;
        }

        // Tab filter: eligible = belum menang, won = sudah menang
        if (tab === 'eligible') {
            baseWhere.prizeWins = { none: {} };
        } else if (tab === 'won') {
            baseWhere.prizeWins = { some: {} };
        }

        // Parallel queries: data + total + stats
        const [data, total, eligibleCount, wonCount] = await this.prisma.$transaction([
            this.prisma.guest.findMany({
                where: baseWhere,
                orderBy: [{ queueNumber: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    guestId: true,
                    name: true,
                    queueNumber: true,
                    company: true,
                    division: true,
                    photoUrl: true,
                    prizeWins: {
                        select: {
                            prize: { select: { name: true, category: true } },
                            wonAt: true,
                        }
                    }
                }
            }),
            this.prisma.guest.count({ where: baseWhere }),
            // Stats tanpa filter tab untuk footer (selalu tampilkan total eligible/won)
            this.prisma.guest.count({
                where: { eventId: active.id, checkedIn: true, prizeWins: { none: {} } }
            }),
            this.prisma.guest.count({
                where: { eventId: active.id, checkedIn: true, prizeWins: { some: {} } }
            }),
        ]);

        return {
            data: data.map(g => ({
                id: g.id,
                guestId: g.guestId,
                name: g.name,
                queueNumber: g.queueNumber,
                company: g.company,
                division: g.division,
                photoUrl: g.photoUrl,
                wonPrizes: g.prizeWins.map(pw => pw.prize.name),
            })),
            total,
            eligible: eligibleCount,
            won: wonCount,
            totalCheckedIn: eligibleCount + wonCount,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
        };
    }

    async create(data: {
        name: string;
        quantity: number;
        description?: string;
        category?: string;
        allowMultipleWins?: boolean;
    }) {
        const active = await this.events.getActive();
        if (!active) throw new BadRequestException('No active event');
        return this.prisma.prize.create({
            data: {
                name: data.name,
                quantity: data.quantity,
                description: data.description,
                category: data.category || 'HIBURAN',
                allowMultipleWins: data.allowMultipleWins ?? false,
                eventId: active.id
            }
        });
    }

    async update(id: string, data: {
        name?: string;
        quantity?: number;
        description?: string;
        category?: string;
        allowMultipleWins?: boolean;
    }) {
        return this.prisma.prize.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.prisma.prize.delete({ where: { id } });
    }

    async drawWinner(prizeId: string) {
        const prize = await this.prisma.prize.findUnique({
            where: { id: prizeId },
            include: {
                prizeWinners: { include: { guest: true } }
            }
        });
        if (!prize) throw new BadRequestException('Prize not found');

        if (prize.prizeWinners.length >= prize.quantity) {
            throw new BadRequestException('Semua hadiah sudah diberikan');
        }

        const active = await this.events.getActive();
        if (!active) throw new BadRequestException('No active event');

        // Get current winner IDs for this prize
        const currentWinnerGuestIds = prize.prizeWinners.map(pw => pw.guestId);

        let eligible;

        if (prize.allowMultipleWins) {
            // Allow guests who already won OTHER prizes to win this prize
            // But exclude guests who already won THIS specific prize
            eligible = await this.prisma.guest.findMany({
                where: {
                    eventId: active.id,
                    checkedIn: true,
                    ...(currentWinnerGuestIds.length > 0 ? { id: { notIn: currentWinnerGuestIds } } : {})
                }
            });
        } else {
            // Default: only guests who haven't won ANY prize yet
            eligible = await this.prisma.guest.findMany({
                where: {
                    eventId: active.id,
                    checkedIn: true,
                    prizeWins: { none: {} }
                }
            });
        }

        if (eligible.length === 0) {
            throw new BadRequestException(
                prize.allowMultipleWins
                    ? 'Semua tamu yang hadir sudah memenangkan hadiah ini'
                    : 'Tidak ada tamu yang memenuhi syarat (semua sudah pernah menang)'
            );
        }

        // Randomly select one
        const winner = eligible[Math.floor(Math.random() * eligible.length)];

        // Create prize winner record
        await this.prisma.prizeWinner.create({
            data: {
                guestId: winner.id,
                prizeId: prize.id
            }
        });

        return winner;
    }

    async resetWinners(prizeId: string) {
        // Remove all prize winners for this prize
        await this.prisma.prizeWinner.deleteMany({
            where: { prizeId }
        });
        return { success: true };
    }

    async getStats() {
        const active = await this.events.getActive();
        if (!active) return { totalPrizes: 0, totalQuantity: 0, totalWon: 0, totalCollected: 0, prizes: [] };

        // Use parallel queries for better performance
        const [prizes, totalCollected] = await this.prisma.$transaction([
            this.prisma.prize.findMany({
                where: { eventId: active.id },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    quantity: true,
                    _count: {
                        select: { prizeWinners: true }
                    },
                    prizeWinners: {
                        select: {
                            collection: { select: { id: true } }
                        }
                    }
                }
            }),
            this.prisma.prizeCollection.count({
                where: {
                    prizeWinner: {
                        prize: { eventId: active.id }
                    }
                }
            })
        ]);

        const prizeStats = prizes.map(p => {
            const won = p._count.prizeWinners;
            const collected = p.prizeWinners.filter(pw => pw.collection).length;
            return {
                id: p.id,
                name: p.name,
                category: p.category,
                quantity: p.quantity,
                won,
                remaining: p.quantity - won,
                collected,
                uncollected: won - collected
            };
        });

        const totalQuantity = prizes.reduce((sum, p) => sum + p.quantity, 0);
        const totalWon = prizes.reduce((sum, p) => sum + p._count.prizeWinners, 0);

        return {
            totalPrizes: prizes.length,
            totalQuantity,
            totalWon,
            totalRemaining: totalQuantity - totalWon,
            totalCollected,
            totalUncollected: totalWon - totalCollected,
            prizes: prizeStats
        };
    }
}
