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
  CheckinResult,
  TeamCheckinStatus,
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

  async regenerate(tournamentId: string): Promise<Tournament> {
    return apiFetch<Tournament>(`${BASE}/${tournamentId}/regenerate-bracket`, {
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

  async finish(matchId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/finish`, { method: 'POST' });
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

  async update(
    matchId: string,
    data: { scheduledAt?: string | null; court?: string | null; teamAId?: string | null; teamBId?: string | null }
  ): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async awardWalkover(matchId: string, winnerId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/walkover`, {
      method: 'POST',
      body: JSON.stringify({ winnerId }),
    });
  },

  async create(tournamentId: string, data: { teamAId?: string; teamBId?: string; roundId?: string; court?: string; scheduledAt?: string }): Promise<Match> {
    return apiFetch<Match>(`${BASE}/${tournamentId}/matches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async delete(matchId: string): Promise<void> {
    return apiFetch<void>(`${BASE}/matches/${matchId}`, {
      method: 'DELETE',
    });
  },

  async reset(matchId: string): Promise<Match> {
    return apiFetch<Match>(`${BASE}/matches/${matchId}/reset`, {
      method: 'POST',
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

/**
 * Tournament Check-in
 */
export const checkinApi = {
  async getTodayMatches(): Promise<any[]> {
    const { apiBase } = await import('./api');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase()}${BASE}/checkin/today-matches`, { headers });
    if (!res.ok) throw new Error('Failed to fetch today matches');
    return res.json();
  },

  async checkIn(data: { guestId: string; adminId?: string; adminName?: string; counterName?: string }): Promise<CheckinResult> {
    // Use direct fetch to preserve error structure (reasons array)
    const { apiBase } = await import('./api');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase()}${BASE}/checkin`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      // Create error with full response data preserved
      const err: any = new Error(json.message || 'Check-in failed');
      err.response = { data: json };
      err.status = res.status;
      throw err;
    }

    return json as CheckinResult;
  },

  async batchSync(checkins: any[]): Promise<{ synced: number; results: any[] }> {
    return apiFetch<{ synced: number; results: any[] }>(`${BASE}/checkin/batch-sync`, {
      method: 'POST',
      body: JSON.stringify({ checkins }),
    });
  },

  async getStatus(tournamentId: string): Promise<TeamCheckinStatus> {
    return apiFetch<TeamCheckinStatus>(`${BASE}/${tournamentId}/checkin-status`);
  },

  async uncheck(tournamentId: string, checkinId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`${BASE}/${tournamentId}/checkin/uncheck`, {
      method: 'DELETE',
      body: JSON.stringify({ checkinId }),
    });
  },
};
