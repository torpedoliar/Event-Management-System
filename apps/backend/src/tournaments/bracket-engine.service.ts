import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from './types/tournament.types';
import { BracketRound } from '@prisma/client';

interface TeamSeed {
  id: string;
  name: string;
  seed: number;
}

interface GeneratedMatch {
  id: string;
  tournamentId: string;
  roundId: string;
  matchNumber: number;
  teamAId?: string | null;
  teamBId?: string | null;
  status: MatchStatus;
  nextMatchId?: string | null;
  nextMatchSlot?: string | null;
}

@Injectable()
export class BracketEngineService {
  constructor(private prisma: PrismaService) {}

  async generateSingleElimination(
    tournamentId: string,
    teams: TeamSeed[],
  ): Promise<GeneratedMatch[]> {
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

    // Generate matches
    const matches: GeneratedMatch[] = [];
    let matchNumber = 1;

    // First round: pair teams with byes for extra slots
    const firstRoundMatches = bracketSize / 2;
    for (let i = 0; i < firstRoundMatches; i++) {
      // Standard seeding: position i pairs with position (bracketSize - 1 - i)
      const teamA = sortedTeams[i] || null;
      const teamB = sortedTeams[bracketSize - 1 - i] || null;

      const match: GeneratedMatch = {
        id: `match-${Date.now()}-${matchNumber}`,
        tournamentId,
        roundId: rounds[0].id,
        matchNumber,
        teamAId: teamA?.id,
        teamBId: teamB?.id,
        status: MatchStatus.SCHEDULED,
      };

      matches.push(match);
      matchNumber++;
    }

    // Subsequent rounds: create placeholder matches
    for (let round = 1; round < numRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round + 1);
      for (let i = 0; i < matchesInRound; i++) {
        const match: GeneratedMatch = {
          id: `match-${Date.now()}-${matchNumber}`,
          tournamentId,
          roundId: rounds[round].id,
          matchNumber,
          status: MatchStatus.SCHEDULED,
        };

        matches.push(match);
        matchNumber++;
      }
    }

    // Set nextMatchId and nextMatchSlot
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const roundIndex = rounds.findIndex((r) => r.id === match.roundId);

      if (roundIndex < numRounds - 1) {
        // Not the final
        const nextRoundStartIndex = matches.findIndex(
          (m) => m.roundId === rounds[roundIndex + 1].id,
        );
        const matchesInCurrentRound = matches.filter(
          (m) => m.roundId === match.roundId,
        );
        const matchIndexInRound = matchesInCurrentRound.findIndex(
          (m) => m.id === match.id,
        );
        const nextMatchIndex =
          nextRoundStartIndex + Math.floor(matchIndexInRound / 2);
        const nextMatch = matches[nextMatchIndex];

        if (nextMatch) {
          match.nextMatchId = nextMatch.id;
          match.nextMatchSlot = matchIndexInRound % 2 === 0 ? 'A' : 'B';
        }
      }
    }

    // Save to database
    const savedMatches = await Promise.all(
      matches.map((m) =>
        this.prisma.match.create({
          data: {
            tournamentId: m.tournamentId,
            roundId: m.roundId,
            matchNumber: m.matchNumber,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            status: m.status,
            nextMatchId: m.nextMatchId,
            nextMatchSlot: m.nextMatchSlot,
          },
        }),
      ),
    );

    // Map to GeneratedMatch interface (Prisma returns full model)
    return savedMatches.map((m) => ({
      id: m.id,
      tournamentId: m.tournamentId,
      roundId: m.roundId!,
      matchNumber: m.matchNumber,
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      status: m.status as MatchStatus,
      nextMatchId: m.nextMatchId,
      nextMatchSlot: m.nextMatchSlot,
    }));
  }

  private getRoundName(roundNumber: number, totalRounds: number): string {
    if (roundNumber === totalRounds) return 'Final';
    if (roundNumber === totalRounds - 1) return 'Semi-Final';
    if (roundNumber === totalRounds - 2) return 'Quarter-Final';
    return `Round of ${Math.pow(2, totalRounds - roundNumber + 1)}`;
  }
}
