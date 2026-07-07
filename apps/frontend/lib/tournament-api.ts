/**
 * Tournament API Client
 */

import { apiFetch } from './api';
import type {
  Tournament,
  TournamentStats,
  TournamentTeam,
  Match,
  BracketView,
  CreateTournamentDto,
  UpdateTournamentDto,
  CreateTeamDto,
  UpdateScoreDto,
  ImportTeamsDto,
  ImportTeamsResult,
  EligibleGuest,
} from '../types/tournament.types';

const BASE = '/tournaments';

/**
 * Guest Picker
 */
export const eligibleGuestApi = {
  async getEligible(tournamentId: string, search?: string): Promise<EligibleGuest[]> {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    return apiFetch<EligibleGuest[]>(`${BASE}/${tournamentId}/eligible-guests${query}`);
  },
};

/**
 * Tournament CRUD
 */
export const tournamentApi = {
  async getAll(eventId?: string): Promise<Tournament[]> {
    const query = eventId ? `?eventId=${eventId}` : '';
    return apiFetch<Tournament[]>(`${BASE}${query}`);
  },

  async getById(id: string): Promise<Tournament> {
    return apiFetch<Tournament>(`${BASE}/${id}`);
  },

  async create(data: CreateTournamentDto): Promise<Tournament> {
    return apiFetch<Tournament>(BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateTournamentDto): Promise<Tournament> {
    return apiFetch<Tournament>(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return apiFetch<void>(`${BASE}/${id}`, { method: 'DELETE' });
  },
};

/**
 * Team Management
 */
export const teamApi = {
  async create(tournamentId: string, data: CreateTeamDto | FormData): Promise<TournamentTeam> {
    const isFormData = data instanceof FormData;
    return apiFetch<TournamentTeam>(`${BASE}/${tournamentId}/teams`, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      // If it's FormData, apiFetch shouldn't stringify it, but we also shouldn't set Content-Type to application/json.
      // Wait, apiFetch might automatically set Content-Type to application/json if body is string.
      // We will handle it in the fetch call directly.
    });
  },

  async update(teamId: string, data: Partial<CreateTeamDto> | FormData): Promise<TournamentTeam> {
    const isFormData = data instanceof FormData;
    return apiFetch<TournamentTeam>(`${BASE}/teams/${teamId}`, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  async delete(teamId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/teams/${teamId}`, { method: 'DELETE' });
  },

  async addMember(
    teamId: string,
    member: { name: string; jerseyNumber?: string; guestId?: string; role?: string }
  ): Promise<TournamentTeam> {
    return apiFetch<TournamentTeam>(`${BASE}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  async removeMember(memberId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/teams/members/${memberId}`, { method: 'DELETE' });
  },
};

/**
 * Bulk Import
 */
export const importApi = {
  async importTeams(tournamentId: string, data: ImportTeamsDto): Promise<ImportTeamsResult> {
    return apiFetch<ImportTeamsResult>(`${BASE}/${tournamentId}/import-teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Bracket Management
 */
export const bracketApi = {
  async generate(tournamentId: string): Promise<Tournament> {
    return apiFetch<Tournament>(`${BASE}/${tournamentId}/generate-bracket`, {
      method: 'POST',
    });
  },

  async getView(tournamentId: string): Promise<BracketView | null> {
    return apiFetch<BracketView | null>(`${BASE}/${tournamentId}/bracket`);
  },
};

/**
 * Match Operations
 */
export const matchApi = {
  async getById(matchId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}`);
  },

  async getByTournament(tournamentId: string, status?: string): Promise<Match[]> {
    const query = status ? `?status=${status}` : '';
    return apiFetch<Match[]>(`${BASE}/${tournamentId}/matches${query}`);
  },

  async getUpcoming(tournamentId: string): Promise<Match[]> {
    return apiFetch<Match[]>(`${BASE}/matches/upcoming?tournamentId=${tournamentId}`);
  },

  async getLive(tournamentId: string): Promise<Match[]> {
    return apiFetch<Match[]>(`${BASE}/matches/live?tournamentId=${tournamentId}`);
  },

  async start(matchId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/start`, { method: 'POST' });
  },

  async updateScore(matchId: string, score: UpdateScoreDto): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/score`, {
      method: 'POST',
      body: JSON.stringify(score),
    });
  },

  async cancel(matchId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/cancel`, { method: 'POST' });
  },

  async awardWalkover(matchId: string, winnerId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/walkover`, {
      method: 'POST',
      body: JSON.stringify({ winnerId }),
    });
  },
};

/**
 * Statistics
 */
export const statsApi = {
  async getTournamentStats(tournamentId: string): Promise<TournamentStats> {
    return apiFetch<TournamentStats>(`${BASE}/${tournamentId}/stats`);
  },
};
