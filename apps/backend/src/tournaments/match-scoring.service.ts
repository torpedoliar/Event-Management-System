import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from './types/tournament.types';
import { UpdateScoreDto } from './dto/update-score.dto';
import { emitEvent } from '../common/sse';

@Injectable()
export class MatchScoringService {
  constructor(private prisma: PrismaService) {}

  async updateScore(matchId: string, scores: UpdateScoreDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Determine winner based on scoring mode
    let winnerId: string | null = null;

    if (match.tournament.scoringMode === 'SETS' && scores.setsA !== undefined && scores.setsB !== undefined) {
      // SETS mode: winner determined by sets won
      winnerId = this.determineWinnerBySets(
        match.teamAId,
        match.teamBId,
        scores.setsA,
        scores.setsB,
      );
    } else {
      // SIMPLE or POINTS mode: winner determined by total score
      winnerId = this.determineWinner(
        match.teamAId,
        match.teamBId,
        scores.scoreA,
        scores.scoreB,
        scores.setsA ?? null,
        scores.setsB ?? null,
      );
    }

    // Update match
    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        scoreA: scores.scoreA,
        scoreB: scores.scoreB,
        setsA: scores.setsA,
        setsB: scores.setsB,
        winnerId,
        status: winnerId ? MatchStatus.COMPLETED : MatchStatus.ONGOING,
        completedAt: winnerId ? new Date() : null,
        startedAt: match.startedAt ?? new Date(),
      },
    });

    // Advance winner to next match
    if (winnerId && match.nextMatchId && match.nextMatchSlot) {
      await this.advanceWinner(match.nextMatchId, match.nextMatchSlot, winnerId);
    }

    // Update team stats
    if (winnerId && match.teamAId && match.teamBId) {
      await this.updateTeamStats(match.teamAId, match.teamBId, winnerId);
    }

    // Emit SSE event
    emitEvent({
      type: winnerId ? 'match_completed' : 'match_score_update',
      data: updatedMatch,
    });

    // Emit bracket update
    emitEvent({
      type: 'bracket_updated',
      data: { tournamentId: match.tournamentId },
    });

    return updatedMatch;
  }

  async startMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.ONGOING,
        startedAt: new Date(),
      },
    });

    // Emit SSE event
    emitEvent({
      type: 'match_started',
      data: updatedMatch,
    });

    return updatedMatch;
  }

  async cancelMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    // Emit SSE event
    emitEvent({
      type: 'match_cancelled',
      data: updatedMatch,
    });

    return updatedMatch;
  }

  async awardWalkover(matchId: string, winnerId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        status: MatchStatus.WALKOVER,
        completedAt: new Date(),
      },
    });

    // Advance winner to next match
    if (match.nextMatchId && match.nextMatchSlot) {
      await this.advanceWinner(match.nextMatchId, match.nextMatchSlot, winnerId);
    }

    // Update team stats
    if (match.teamAId && match.teamBId) {
      const loserId = winnerId === match.teamAId ? match.teamBId : match.teamAId;
      await this.prisma.tournamentTeam.update({
        where: { id: winnerId },
        data: { wins: { increment: 1 } },
      });
      await this.prisma.tournamentTeam.update({
        where: { id: loserId },
        data: { losses: { increment: 1 }, isEliminated: true },
      });
    }

    return updatedMatch;
  }

  determineWinner(
    teamAId: string | null,
    teamBId: string | null,
    scoreA: number,
    scoreB: number,
    setsA: number | null,
    setsB: number | null,
  ): string | null {
    if (scoreA > scoreB) {
      return teamAId;
    } else if (scoreB > scoreA) {
      return teamBId;
    }
    return null; // Tie - no winner yet
  }

  determineWinnerBySets(
    teamAId: string | null,
    teamBId: string | null,
    setsA: number,
    setsB: number,
  ): string | null {
    const maxSets = 3; // Default best of 5
    if (setsA > setsB && setsA >= Math.ceil(maxSets / 2)) {
      return teamAId;
    } else if (setsB > setsA && setsB >= Math.ceil(maxSets / 2)) {
      return teamBId;
    }
    return null;
  }

  private async advanceWinner(
    nextMatchId: string,
    slot: string,
    winnerId: string,
  ) {
    const updateData = slot === 'A' ? { teamAId: winnerId } : { teamBId: winnerId };

    await this.prisma.match.update({
      where: { id: nextMatchId },
      data: updateData,
    });
  }

  private async updateTeamStats(
    teamAId: string,
    teamBId: string,
    winnerId: string,
  ) {
    // Update winner
    await this.prisma.tournamentTeam.update({
      where: { id: winnerId },
      data: { wins: { increment: 1 } },
    });

    // Update loser
    const loserId = winnerId === teamAId ? teamBId : teamAId;
    await this.prisma.tournamentTeam.update({
      where: { id: loserId },
      data: { losses: { increment: 1 }, isEliminated: true },
    });
  }
}
