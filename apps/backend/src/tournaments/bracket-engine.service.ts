import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from './types/tournament.types';
import { BracketRound, Match } from '@prisma/client';

interface TeamSeed {
  id: string;
  name: string;
  seed: number;
}

@Injectable()
export class BracketEngineService {
  constructor(private prisma: PrismaService) {}

  async generateSingleElimination(
    tournamentId: string,
    teams: TeamSeed[],
  ): Promise<Match[]> {
    if (teams.length < 2) {
      throw new Error('Minimum 2 teams required');
    }

    // Round up to next power of 2
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, numRounds);

    // Sort teams by seed
    const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);

    // Create bracket
    const bracket = await this.prisma.tournamentBracket.create({
      data: {
        tournamentId,
        type: 'WINNER',
      },
    });

    // Create rounds
    const rounds: BracketRound[] = [];
    for (let i = 1; i <= numRounds; i++) {
      const roundName = this.getRoundName(i, numRounds);
      const round = await this.prisma.bracketRound.create({
        data: {
          bracketId: bracket.id,
          roundNumber: i,
          name: roundName,
        },
      });
      rounds.push(round);
    }

    // ── Phase 1: Create all matches WITHOUT nextMatchId ──
    // We need the real DB-generated UUIDs before we can wire up references.
    let matchNumber = 1;

    // First round: pair teams with byes for extra slots
    const firstRoundMatches = bracketSize / 2;
    const firstRoundCreated: Match[] = [];
    
    // Use standard folded seeding to avoid top seeds meeting early
    const seeding = this.getStandardSeeding(bracketSize);

    for (let i = 0; i < firstRoundMatches; i++) {
      const seedA = seeding[i * 2];
      const seedB = seeding[i * 2 + 1];

      const teamA = sortedTeams[seedA - 1] || null;
      const teamB = sortedTeams[seedB - 1] || null;

      const created = await this.prisma.match.create({
        data: {
          tournamentId,
          roundId: rounds[0].id,
          matchNumber,
          teamAId: teamA?.id ?? null,
          teamBId: teamB?.id ?? null,
          status: MatchStatus.SCHEDULED,
        },
      });
      firstRoundCreated.push(created);
      matchNumber++;
    }

    // Subsequent rounds: create placeholder matches (no teams yet)
    const laterRoundCreated: Match[] = [];
    for (let round = 1; round < numRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round + 1);
      for (let i = 0; i < matchesInRound; i++) {
        const created = await this.prisma.match.create({
          data: {
            tournamentId,
            roundId: rounds[round].id,
            matchNumber,
            status: MatchStatus.SCHEDULED,
          },
        });
        laterRoundCreated.push(created);
        matchNumber++;
      }
    }

    // ── Phase 2: Wire up nextMatchId + nextMatchSlot ──
    // Group matches by round for easy index lookup.
    const allCreated = [...firstRoundCreated, ...laterRoundCreated];
    const matchesByRound: Match[][] = [];
    for (let r = 0; r < numRounds; r++) {
      matchesByRound.push(
        allCreated.filter((m) => m.roundId === rounds[r].id),
      );
    }

    const updatePromises: Promise<Match>[] = [];
    for (let r = 0; r < numRounds - 1; r++) {
      const currentRoundMatches = matchesByRound[r];
      const nextRoundMatches = matchesByRound[r + 1];

      for (let i = 0; i < currentRoundMatches.length; i++) {
        const match = currentRoundMatches[i];
        const nextMatchIndex = Math.floor(i / 2);
        const slot = i % 2 === 0 ? 'A' : 'B';
        const nextMatch = nextRoundMatches[nextMatchIndex];

        if (nextMatch) {
          updatePromises.push(
            this.prisma.match.update({
              where: { id: match.id },
              data: {
                nextMatchId: nextMatch.id,
                nextMatchSlot: slot,
              },
            }),
          );
        }
      }
    }

    await Promise.all(updatePromises);

    // ── Phase 3: Auto-advance BYE matches ──
    // Any first-round match with only one team is a BYE.
    // Auto-complete as WALKOVER and advance the real team.
    for (const match of firstRoundCreated) {
      const hasTeamA = match.teamAId !== null;
      const hasTeamB = match.teamBId !== null;

      // Both teams exist or both missing → skip
      if ((hasTeamA && hasTeamB) || (!hasTeamA && !hasTeamB)) continue;

      const winnerId = hasTeamA ? match.teamAId! : match.teamBId!;

      // Mark match as WALKOVER
      await this.prisma.match.update({
        where: { id: match.id },
        data: {
          winnerId,
          status: MatchStatus.WALKOVER,
          completedAt: new Date(),
        },
      });

      // Advance winner to next match (re-fetch to get wired nextMatchId)
      const wired = await this.prisma.match.findUnique({
        where: { id: match.id },
        select: { nextMatchId: true, nextMatchSlot: true },
      });

      if (wired?.nextMatchId && wired?.nextMatchSlot) {
        const slotData =
          wired.nextMatchSlot === 'A'
            ? { teamAId: winnerId }
            : { teamBId: winnerId };
        await this.prisma.match.update({
          where: { id: wired.nextMatchId },
          data: slotData,
        });
      }
    }

    // Return all matches (with final UUIDs and nextMatchId wired up)
    return this.prisma.match.findMany({
      where: { tournamentId, roundId: { in: rounds.map((r) => r.id) } },
      include: { teamA: true, teamB: true },
      orderBy: { matchNumber: 'asc' },
    });
  }

  async clearBracket(tournamentId: string): Promise<void> {
    // Find all brackets for this tournament
    const brackets = await this.prisma.tournamentBracket.findMany({
      where: { tournamentId },
      include: {
        rounds: {
          include: { matches: true },
        },
      },
    });

    // Delete all matches first (foreign key constraint)
    for (const bracket of brackets) {
      for (const round of bracket.rounds) {
        if (round.matches.length > 0) {
          await this.prisma.match.deleteMany({
            where: { id: { in: round.matches.map((m) => m.id) } },
          });
        }
      }
    }

    // Delete all rounds
    for (const bracket of brackets) {
      await this.prisma.bracketRound.deleteMany({
        where: { bracketId: bracket.id },
      });
    }

    // Delete all brackets
    await this.prisma.tournamentBracket.deleteMany({
      where: { tournamentId },
    });

    // Reset team stats
    await this.prisma.tournamentTeam.updateMany({
      where: { tournamentId },
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
      },
    });
  }

  private getRoundName(roundNumber: number, totalRounds: number): string {
    if (roundNumber === totalRounds) return 'Final';
    if (roundNumber === totalRounds - 1) return 'Semi-Final';
    if (roundNumber === totalRounds - 2) return 'Quarter-Final';
    return `Round of ${Math.pow(2, totalRounds - roundNumber + 1)}`;
  }

  /**
   * Generates a standard folded seed placement array.
   * Ensures top seeds are spread across the bracket (e.g. for 8 teams: [1, 8, 4, 5, 2, 7, 3, 6])
   */
  private getStandardSeeding(bracketSize: number): number[] {
    let matches = [1, 2];
    for (let round = 2; Math.pow(2, round) <= bracketSize; round++) {
      const currentSize = Math.pow(2, round);
      const newMatches: number[] = [];
      for (let i = 0; i < matches.length; i++) {
        newMatches.push(matches[i]);
        newMatches.push(currentSize + 1 - matches[i]);
      }
      matches = newMatches;
    }
    return matches;
  }
}
