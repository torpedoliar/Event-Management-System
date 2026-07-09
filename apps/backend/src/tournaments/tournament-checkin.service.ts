import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { emitEvent } from '../common/sse';
import { TournamentCheckinDto, TournamentCheckinBatchSyncDto } from './dto/tournament-checkin.dto';

@Injectable()
export class TournamentCheckinService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get start and end of today in local timezone
   */
  private getTodayRange(): { startOfDay: Date; endOfDay: Date } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }

  /**
   * Get all matches scheduled today across all active tournaments with check-in enabled.
   * Returns matches grouped by tournament with check-in counts.
   */
  async getTodayMatches() {
    const { startOfDay, endOfDay } = this.getTodayRange();

    const matches = await this.prisma.match.findMany({
      where: {
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        tournament: {
          enableMatchCheckin: true,
          status: 'IN_PROGRESS',
        },
      },
      include: {
        teamA: {
          include: { members: true },
        },
        teamB: {
          include: { members: true },
        },
        tournament: true,
        round: true,
        checkins: true,
      },
      orderBy: [
        { tournament: { name: 'asc' } },
        { scheduledAt: 'asc' },
      ],
    });

    // Group by tournament
    const grouped: Record<string, {
      tournament: any;
      matches: Array<{
        id: string;
        matchNumber: number;
        scheduledAt: Date | null;
        court: string | null;
        status: string;
        round: string | null;
        teamA: { id: string; name: string; isEliminated: boolean; memberCount: number } | null;
        teamB: { id: string; name: string; isEliminated: boolean; memberCount: number } | null;
        checkinCount: number;
        totalMembers: number;
      }>;
    }> = {};

    for (const match of matches) {
      const tId = match.tournamentId;
      if (!grouped[tId]) {
        grouped[tId] = {
          tournament: {
            id: match.tournament.id,
            name: match.tournament.name,
            sportType: match.tournament.sportType,
          },
          matches: [],
        };
      }

      const totalMembers =
        (match.teamA?.members?.length || 0) +
        (match.teamB?.members?.length || 0);

      grouped[tId].matches.push({
        id: match.id,
        matchNumber: match.matchNumber,
        scheduledAt: match.scheduledAt,
        court: match.court,
        status: match.status,
        round: match.round?.name || null,
        teamA: match.teamA ? {
          id: match.teamA.id,
          name: match.teamA.name,
          isEliminated: match.teamA.isEliminated,
          memberCount: match.teamA.members?.length || 0,
        } : null,
        teamB: match.teamB ? {
          id: match.teamB.id,
          name: match.teamB.name,
          isEliminated: match.teamB.isEliminated,
          memberCount: match.teamB.members?.length || 0,
        } : null,
        checkinCount: match.checkins?.length || 0,
        totalMembers,
      });
    }

    return Object.values(grouped);
  }

  async checkInMember(dto: TournamentCheckinDto) {
    // 1. Find Guest by guestId
    const guest = await this.prisma.guest.findFirst({
      where: { guestId: dto.guestId },
    });

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // 2. Find TeamMembers where guestId matches and tournament has enableMatchCheckin
    const memberships = await this.prisma.teamMember.findMany({
      where: {
        guestId: guest.id,
        team: {
          tournament: {
            enableMatchCheckin: true,
            status: 'IN_PROGRESS',
          },
        },
      },
      include: {
        team: {
          include: {
            tournament: true,
          },
        },
      },
    });

    if (memberships.length === 0) {
      throw new ConflictException({
        message: 'Tamu tidak terdaftar dalam tim tournament aktif',
        reasons: ['Tidak ditemukan keanggotaan tim dengan check-in aktif'],
      });
    }

    const { startOfDay, endOfDay } = this.getTodayRange();
    const reasons: string[] = [];
    let candidate: { memberId: string; teamId: string; tournamentId: string; matchId: string; match: any } | null = null;

    // 3. For each membership, validate
    for (const membership of memberships) {
      const team = membership.team;
      const tournament = team.tournament;

      // Check eliminated
      if (team.isEliminated) {
        reasons.push(`Tim ${team.name} sudah tereliminasi`);
        continue;
      }

      // Find eligible match: team is in match, SCHEDULED, scheduled today
      const eligibleMatch = await this.prisma.match.findFirst({
        where: {
          tournamentId: tournament.id,
          status: 'SCHEDULED',
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          OR: [
            { teamAId: team.id },
            { teamBId: team.id },
          ],
        },
        include: {
          teamA: true,
          teamB: true,
          round: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      if (!eligibleMatch) {
        // Check if team has a future match (not today) — give helpful message
        const futureMatch = await this.prisma.match.findFirst({
          where: {
            tournamentId: tournament.id,
            status: 'SCHEDULED',
            scheduledAt: {
              gt: endOfDay,
            },
            OR: [
              { teamAId: team.id },
              { teamBId: team.id },
            ],
          },
          orderBy: { scheduledAt: 'asc' },
        });

        if (futureMatch) {
          const matchDate = new Date(futureMatch.scheduledAt!).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          });
          reasons.push(`Jadwal pertandingan ${team.name} berikutnya: ${matchDate}`);
        } else {
          reasons.push(`Tidak ada jadwal pertandingan hari ini untuk tim ${team.name}`);
        }
        continue;
      }

      // Found a candidate
      candidate = {
        memberId: membership.id,
        teamId: team.id,
        tournamentId: tournament.id,
        matchId: eligibleMatch.id,
        match: eligibleMatch,
      };
      break;
    }

    if (!candidate) {
      throw new ConflictException({
        message: 'Check-in ditolak',
        reasons: reasons.length > 0 ? reasons : ['Tidak ada jadwal pertandingan yang sesuai'],
      });
    }

    // 4. Upsert TournamentCheckin (idempotent via @@unique)
    try {
      const checkin = await this.prisma.tournamentCheckin.create({
        data: {
          memberId: candidate.memberId,
          matchId: candidate.matchId,
          teamId: candidate.teamId,
          tournamentId: candidate.tournamentId,
          guestId: guest.id,
          checkedById: dto.adminId,
          checkedByName: dto.adminName,
          counterName: dto.counterName,
        },
      });

      // Create GuestCheckin (core) for consistency
      await this.prisma.guestCheckin.create({
        data: {
          guestId: guest.id,
          checkinById: dto.adminId,
          checkinByName: dto.adminName,
          counterName: dto.counterName,
        },
      });

      // Increment checkinCount
      await this.prisma.guest.update({
        where: { id: guest.id },
        data: { checkinCount: { increment: 1 } },
      });

      // Emit SSE
      emitEvent({
        type: 'tournament_checkin',
        data: {
          tournamentId: candidate.tournamentId,
          memberId: candidate.memberId,
          matchId: candidate.matchId,
        },
      });

      return {
        success: true,
        alreadyCheckedIn: false,
        checkinId: checkin.id,
        match: {
          id: candidate.match.id,
          teamA: candidate.match.teamA?.name,
          teamB: candidate.match.teamB?.name,
          round: candidate.match.round?.name || null,
          tournament: candidate.match.tournament?.name || null,
        },
      };
    } catch (err: any) {
      // Unique constraint violation = already checked in
      if (err.code === 'P2002') {
        return {
          success: true,
          alreadyCheckedIn: true,
          message: 'Sudah check-in untuk match ini',
        };
      }
      throw err;
    }
  }

  async getTeamCheckinStatus(tournamentId: string) {
    const checkins = await this.prisma.tournamentCheckin.findMany({
      where: { tournamentId },
      include: {
        match: {
          include: {
            teamA: true,
            teamB: true,
          },
        },
      },
    });

    const status: Record<string, { checkedIn: boolean; matchId?: string; matchLabel?: string; checkedAt?: string }> = {};

    for (const checkin of checkins) {
      const matchLabel = checkin.match
        ? `${checkin.match.teamA?.name ?? '?'} vs ${checkin.match.teamB?.name ?? '?'}`
        : undefined;

      status[checkin.memberId] = {
        checkedIn: true,
        matchId: checkin.matchId,
        matchLabel,
        checkedAt: checkin.checkedAt.toISOString(),
      };
    }

    return status;
  }

  async batchSyncOfflineCheckins(dto: TournamentCheckinBatchSyncDto) {
    const results = [];

    for (const checkinDto of dto.checkins) {
      try {
        const result = await this.checkInMember({
          guestId: checkinDto.guestId,
          adminId: checkinDto.adminId,
          adminName: checkinDto.adminName,
          counterName: checkinDto.counterName,
        });

        // Mark as offline synced
        if (result.checkinId && checkinDto.isOffline) {
          await this.prisma.tournamentCheckin.update({
            where: { id: result.checkinId },
            data: {
              isOffline: true,
              clientTimestamp: new Date(checkinDto.clientTimestamp),
              syncedAt: new Date(),
            },
          });
        }

        results.push({ ...result, guestId: checkinDto.guestId });
      } catch (err: any) {
        const message = err?.response?.message || err.message || 'Sync failed';
        const reasons = err?.response?.reasons || [];
        results.push({
          success: false,
          guestId: checkinDto.guestId,
          error: typeof message === 'string' ? message : JSON.stringify(message),
          reasons,
          isDuplicate: err.code === 'P2002',
        });
      }
    }

    return { synced: results.length, results };
  }

  async uncheckTournamentCheckin(checkinId: string) {
    const checkin = await this.prisma.tournamentCheckin.findUnique({
      where: { id: checkinId },
    });

    if (!checkin) {
      throw new NotFoundException('Check-in not found');
    }

    // Delete TournamentCheckin
    await this.prisma.tournamentCheckin.delete({
      where: { id: checkinId },
    });

    // Revert GuestCheckin (core) — delete the most recent one for this guest
    if (checkin.guestId) {
      const latestGuestCheckin = await this.prisma.guestCheckin.findFirst({
        where: { guestId: checkin.guestId },
        orderBy: { checkinAt: 'desc' },
      });

      if (latestGuestCheckin) {
        await this.prisma.guestCheckin.delete({
          where: { id: latestGuestCheckin.id },
        });
      }

      // Decrement checkinCount (guard against negative)
      const guest = await this.prisma.guest.findUnique({
        where: { id: checkin.guestId },
        select: { checkinCount: true },
      });
      if (guest && guest.checkinCount > 0) {
        await this.prisma.guest.update({
          where: { id: checkin.guestId },
          data: { checkinCount: { decrement: 1 } },
        });
      }
    }

    // Emit SSE
    emitEvent({
      type: 'tournament_checkin',
      data: {
        tournamentId: checkin.tournamentId,
        memberId: checkin.memberId,
        matchId: checkin.matchId,
        unchecked: true,
      },
    });

    return { success: true };
  }
}
