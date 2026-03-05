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
