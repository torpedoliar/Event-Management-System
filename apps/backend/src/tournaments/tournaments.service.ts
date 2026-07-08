import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { CreateTeamDto, CreateTeamMemberDto } from './dto/create-team.dto';
import { ImportTeamsDto, ImportTeamDto } from './dto/import-teams.dto';
import { TournamentStatus } from './types/tournament.types';
import { BracketEngineService } from './bracket-engine.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class TournamentsService {
  constructor(
    private prisma: PrismaService,
    private bracketEngine: BracketEngineService,
    private events: EventsService,
  ) {}

  private async getActiveEventId(): Promise<string | null> {
    const active = await this.events.getActive();
    return active ? active.id : null;
  }

  // ============================================
  // Tournament CRUD
  // ============================================

  async create(createTournamentDto: CreateTournamentDto) {
    let eventId = createTournamentDto.eventId;
    if (!eventId) {
      eventId = (await this.getActiveEventId()) ?? undefined;
    }
    return this.prisma.tournament.create({
      data: {
        name: createTournamentDto.name,
        sportType: createTournamentDto.sportType,
        formatType: createTournamentDto.formatType,
        participantType: createTournamentDto.participantType,
        scoringMode: createTournamentDto.scoringMode,
        scoringConfig: createTournamentDto.scoringConfig as object,
        schedulingMode: createTournamentDto.schedulingMode,
        courtCount: createTournamentDto.courtCount,
        startDate: createTournamentDto.startDate
          ? new Date(createTournamentDto.startDate)
          : null,
        endDate: createTournamentDto.endDate
          ? new Date(createTournamentDto.endDate)
          : null,
        eventId: eventId || null,
      },
      include: {
        teams: {
          include: { members: true },
        },
        brackets: {
          include: {
            rounds: {
              include: {
                matches: {
                  include: {
                    teamA: true,
                    teamB: true,
                    winner: true,
                  },
                },
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
      },
    });
  }

  async findAll(eventId?: string) {
    if (!eventId) {
      const activeId = await this.getActiveEventId();
      if (activeId) eventId = activeId;
    }
    return this.prisma.tournament.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        teams: {
          include: { members: true },
        },
        _count: {
          select: { matches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: {
          include: { members: true },
          orderBy: { seed: 'asc' },
        },
        brackets: {
          include: {
            rounds: {
              include: {
                matches: {
                  include: {
                    teamA: true,
                    teamB: true,
                    winner: true,
                  },
                },
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
        matches: {
          include: {
            teamA: true,
            teamB: true,
            winner: true,
            round: true,
          },
          orderBy: { matchNumber: 'asc' },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async update(id: string, updateTournamentDto: UpdateTournamentDto) {
    await this.findOne(id); // Verify exists

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        name: updateTournamentDto.name,
        sportType: updateTournamentDto.sportType,
        formatType: updateTournamentDto.formatType,
        participantType: updateTournamentDto.participantType,
        scoringMode: updateTournamentDto.scoringMode,
        scoringConfig: updateTournamentDto.scoringConfig as object,
        schedulingMode: updateTournamentDto.schedulingMode,
        courtCount: updateTournamentDto.courtCount,
        status: updateTournamentDto.status,
        startDate: updateTournamentDto.startDate
          ? new Date(updateTournamentDto.startDate)
          : undefined,
        endDate: updateTournamentDto.endDate
          ? new Date(updateTournamentDto.endDate)
          : undefined,
      },
      include: {
        teams: {
          include: { members: true },
          orderBy: { seed: 'asc' },
        },
        brackets: {
          include: {
            rounds: {
              include: {
                matches: {
                  include: { teamA: true, teamB: true, winner: true },
                },
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
      },
    });

    // Emit SSE event so frontend refreshes automatically
    const { emitEvent } = await import('../common/sse');
    emitEvent({
      type: 'tournament_updated',
      data: updated,
    });

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id); // Verify exists
    return this.prisma.tournament.delete({ where: { id } });
  }

  // ============================================
  // Team CRUD
  // ============================================

  async createTeam(tournamentId: string, createTeamDto: CreateTeamDto) {
    // Verify tournament exists
    await this.findOne(tournamentId);

    const team = await this.prisma.tournamentTeam.create({
      data: {
        tournamentId,
        name: createTeamDto.name,
        logoUrl: createTeamDto.logoUrl,
        seed: createTeamDto.seed,
        members: createTeamDto.members
          ? {
              create: createTeamDto.members.map((member) => ({
                name: member.name,
                photoUrl: member.photoUrl,
                jerseyNumber: member.jerseyNumber,
                guestId: member.guestId,
                role: member.role,
              })),
            }
          : undefined,
      },
      include: { members: true },
    });

    return team;
  }

  async updateTeam(teamId: string, data: Partial<CreateTeamDto>) {
    const team = await this.prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.tournamentTeam.update({
      where: { id: teamId },
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        seed: data.seed,
      },
      include: { members: true },
    });
  }

  async removeTeam(teamId: string) {
    const team = await this.prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.tournamentTeam.delete({ where: { id: teamId } });
  }

  async addTeamMember(teamId: string, memberDto: CreateTeamMemberDto) {
    const team = await this.prisma.tournamentTeam.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.prisma.teamMember.create({
      data: {
        teamId,
        name: memberDto.name,
        photoUrl: memberDto.photoUrl,
        jerseyNumber: memberDto.jerseyNumber,
        guestId: memberDto.guestId,
        role: memberDto.role,
      },
    });
  }

  async removeTeamMember(memberId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return this.prisma.teamMember.delete({ where: { id: memberId } });
  }

  // ============================================
  // Guest Picker
  // ============================================

  /**
   * Fetch guests from the tournament's event that are NOT yet members
   * of any team in this tournament. Used by the guest picker UI.
   */
  async getEligibleGuests(tournamentId: string, search?: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { eventId: true },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Standalone tournament (no event) — no guests to pick from
    if (!tournament.eventId) {
      return [];
    }

    // Collect all guestIds already assigned to teams in this tournament
    const assignedMembers = await this.prisma.teamMember.findMany({
      where: { team: { tournamentId } },
      select: { guestId: true },
    });
    const assignedGuestIds = assignedMembers
      .map((m) => m.guestId)
      .filter((id): id is string => !!id);

    const where: any = { eventId: tournament.eventId };
    if (assignedGuestIds.length > 0) {
      where.id = { notIn: assignedGuestIds };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { guestId: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.guest.findMany({
      where,
      select: {
        id: true,
        guestId: true,
        name: true,
        company: true,
        department: true,
        division: true,
        category: true,
        checkedIn: true,
      },
      orderBy: { name: 'asc' },
      take: 50, // limit for picker performance
    });
  }

  // ============================================
  // Bulk Import
  // ============================================

  async importTeams(tournamentId: string, importDto: ImportTeamsDto) {
    // Verify tournament exists
    await this.findOne(tournamentId);

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      teams: [] as any[],
    };

    for (const teamData of importDto.teams) {
      try {
        // Check for duplicate team name
        const existingTeam = await this.prisma.tournamentTeam.findFirst({
          where: {
            tournamentId,
            name: teamData.name,
          },
        });

        if (existingTeam) {
          results.skipped++;
          results.errors.push(`Team "${teamData.name}" already exists, skipping`);
          continue;
        }

        const team = await this.prisma.tournamentTeam.create({
          data: {
            tournamentId,
            name: teamData.name,
            logoUrl: teamData.logoUrl,
            seed: teamData.seed,
            members: teamData.members
              ? {
                  create: teamData.members.map((member) => ({
                    name: member.name,
                    jerseyNumber: member.jerseyNumber,
                    guestId: member.guestId,
                    role: member.role,
                  })),
                }
              : undefined,
          },
          include: { members: true },
        });

        results.teams.push(team);
        results.imported++;
      } catch (error) {
        results.errors.push(`Error importing team "${teamData.name}": ${error}`);
      }
    }

    return results;
  }

  // ============================================
  // Bracket Generation
  // ============================================

  async generateBracket(tournamentId: string) {
    const tournament = await this.findOne(tournamentId);

    if (tournament.teams.length < 2) {
      throw new Error('Minimum 2 teams required to generate bracket');
    }

    // Check if bracket already exists
    if (tournament.brackets.length > 0) {
      throw new Error('Bracket already exists for this tournament');
    }

    const teams = tournament.teams.map((t) => ({
      id: t.id,
      name: t.name,
      seed: t.seed ?? t.name.length,
    }));

    await this.bracketEngine.generateSingleElimination(
      tournamentId,
      teams,
    );

    // Update tournament status to IN_PROGRESS
    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.IN_PROGRESS },
      include: {
        teams: { include: { members: true } },
        brackets: {
          include: {
            rounds: {
              include: {
                matches: {
                  include: { teamA: true, teamB: true, winner: true },
                },
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
      },
    });

    // Emit SSE events for real-time updates
    const { emitEvent } = await import('../common/sse');
    emitEvent({
      type: 'tournament_updated',
      data: updated,
    });
    emitEvent({
      type: 'bracket_updated',
      data: { tournamentId },
    });

    return updated;
  }

  // ============================================
  // Match Operations
  // ============================================

  async getMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: true } },
        teamB: { include: { members: true } },
        winner: true,
        round: true,
        tournament: true,
        sets: { orderBy: { setNumber: 'asc' } },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async getMatchesByTournament(tournamentId: string, status?: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        status: status as any,
      },
      include: {
        teamA: true,
        teamB: true,
        winner: true,
        round: true,
      },
      orderBy: [{ round: { roundNumber: 'asc' } }, { matchNumber: 'asc' }],
    });
  }

  async getUpcomingMatches(tournamentId: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        status: 'SCHEDULED',
      },
      include: {
        teamA: true,
        teamB: true,
      },
      orderBy: { matchNumber: 'asc' },
    });
  }

  async getLiveMatches(tournamentId: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        status: 'ONGOING',
      },
      include: {
        teamA: true,
        teamB: true,
      },
    });
  }

  async getCompletedMatches(tournamentId: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        status: { in: ['COMPLETED', 'WALKOVER'] },
      },
      include: {
        teamA: true,
        teamB: true,
        winner: true,
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  // ============================================
  // Statistics
  // ============================================

  async getTournamentStats(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            teams: true,
            matches: true,
          },
        },
        teams: {
          select: {
            id: true,
            name: true,
            wins: true,
            losses: true,
            draws: true,
          },
          orderBy: { wins: 'desc' },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const matchStats = await this.prisma.match.groupBy({
      by: ['status'],
      where: { tournamentId },
      _count: true,
    });

    return {
      totalTeams: tournament._count.teams,
      totalMatches: tournament._count.matches,
      teams: tournament.teams,
      matchStats: matchStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  async getBracketView(tournamentId: string) {
    const tournament = await this.findOne(tournamentId);

    if (tournament.brackets.length === 0) {
      return null;
    }

    const bracket = tournament.brackets[0];

    return {
      id: bracket.id,
      type: bracket.type,
      rounds: bracket.rounds.map((round) => ({
        id: round.id,
        name: round.name,
        roundNumber: round.roundNumber,
        matches: round.matches.map((match) => ({
          id: match.id,
          matchNumber: match.matchNumber,
          teamA: match.teamA
            ? {
                id: match.teamA.id,
                name: match.teamA.name,
                logoUrl: match.teamA.logoUrl,
                score: match.scoreA,
              }
            : null,
          teamB: match.teamB
            ? {
                id: match.teamB.id,
                name: match.teamB.name,
                logoUrl: match.teamB.logoUrl,
                score: match.scoreB,
              }
            : null,
          winner: match.winner
            ? {
                id: match.winner.id,
                name: match.winner.name,
              }
            : null,
          status: match.status,
          nextMatchId: match.nextMatchId,
        })),
      })),
    };
  }
}
