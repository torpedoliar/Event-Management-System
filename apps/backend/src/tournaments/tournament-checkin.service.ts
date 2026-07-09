import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { emitEvent } from '../common/sse';
import { TournamentCheckinDto, TournamentCheckinBatchSyncDto } from './dto/tournament-checkin.dto';

@Injectable()
export class TournamentCheckinService {
  constructor(private prisma: PrismaService) {}

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

      // Find eligible match: team is in match, SCHEDULED, scheduledAt not null, within window
      const now = new Date();
      const windowStart = new Date(now.getTime() - (tournament.checkinWindowMinutes || 30) * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (tournament.checkinCloseMinutes || 15) * 60 * 1000);

      const eligibleMatch = await this.prisma.match.findFirst({
        where: {
          tournamentId: tournament.id,
          status: 'SCHEDULED',
          scheduledAt: {
            not: null,
            gte: windowStart,
            lte: windowEnd,
          },
          OR: [
            { teamAId: team.id },
            { teamBId: team.id },
          ],
        },
        include: {
          teamA: true,
          teamB: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      if (!eligibleMatch) {
        reasons.push(`Tidak sesuai jadwal pertandingan untuk tim ${team.name}`);
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
        results.push({
          success: false,
          guestId: checkinDto.guestId,
          error: err.message || 'Sync failed',
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

    await this.prisma.tournamentCheckin.delete({
      where: { id: checkinId },
    });

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
