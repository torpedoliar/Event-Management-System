/**
 * Tournament System TypeScript Types
 */

// ============================================
// Enums (matching backend)
// ============================================

export enum SportType {
  FUTSAL = 'FUTSAL',
  BASKET = 'BASKET',
  VOLLEY = 'VOLLEY',
  BADMINTON = 'BADMINTON',
  CHESS = 'CHESS',
  ESPORTS = 'ESPORTS',
  OTHER = 'OTHER',
}

export enum TournamentFormat {
  SINGLE_ELIM = 'SINGLE_ELIM',
  DOUBLE_ELIM = 'DOUBLE_ELIM',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SWISS = 'SWISS',
  GROUP_KNOCKOUT = 'GROUP_KNOCKOUT',
}

export enum ParticipantType {
  TEAM = 'TEAM',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum ScoringMode {
  SIMPLE = 'SIMPLE',
  SETS = 'SETS',
  POINTS = 'POINTS',
}

export enum SchedulingMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  WALKOVER = 'WALKOVER',
}

// ============================================
// Core Types
// ============================================

export interface ScoringConfig {
  maxSets?: number;
  targetPoints?: number;
}

// ============================================
// DTO Types (for API requests)
// ============================================

export interface CreateTournamentDto {
  name: string;
  sportType: SportType;
  formatType: TournamentFormat;
  participantType: ParticipantType;
  scoringMode?: ScoringMode;
  scoringConfig?: ScoringConfig;
  schedulingMode?: SchedulingMode;
  courtCount?: number;
  startDate?: string;
  endDate?: string;
  eventId?: string;
}

export interface UpdateTournamentDto extends Partial<CreateTournamentDto> {
  status?: TournamentStatus;
}

export interface CreateTeamMemberDto {
  name: string;
  photoUrl?: string;
  jerseyNumber?: string;
  guestId?: string;
  role?: string;
}

export interface CreateTeamDto {
  name: string;
  logoUrl?: string;
  seed?: number;
  members?: CreateTeamMemberDto[];
}

export interface UpdateScoreDto {
  scoreA: number;
  scoreB: number;
  setsA?: number;
  setsB?: number;
}

export interface ImportTeamDto {
  name: string;
  logoUrl?: string;
  seed?: number;
  members?: CreateTeamMemberDto[];
}

export interface ImportTeamsDto {
  teams: ImportTeamDto[];
}

// ============================================
// Model Types (from API responses)
// ============================================

export interface Tournament {
  id: string;
  name: string;
  sportType: SportType;
  formatType: TournamentFormat;
  participantType: ParticipantType;
  scoringMode: ScoringMode;
  scoringConfig?: ScoringConfig;
  schedulingMode: SchedulingMode;
  courtCount: number;
  status: TournamentStatus;
  startDate?: string;
  endDate?: string;
  eventId?: string;
  teams?: TournamentTeam[];
  brackets?: TournamentBracket[];
  matches?: Match[];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  name: string;
  logoUrl?: string;
  seed?: number;
  isEliminated: boolean;
  wins: number;
  losses: number;
  draws: number;
  members?: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  name: string;
  photoUrl?: string;
  jerseyNumber?: string;
  guestId?: string;
  role?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  roundId?: string;
  matchNumber: number;
  teamAId?: string;
  teamA?: TournamentTeam;
  teamBId?: string;
  teamB?: TournamentTeam;
  scoreA?: number;
  scoreB?: number;
  setsA?: number;
  setsB?: number;
  winnerId?: string;
  winner?: TournamentTeam;
  status: MatchStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  court?: string;
  nextMatchId?: string;
  nextMatchSlot?: string;
  round?: BracketRound;
  sets?: MatchSet[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchSet {
  id: string;
  matchId: string;
  setNumber: number;
  scoreA: number;
  scoreB: number;
  createdAt: string;
}

export interface TournamentBracket {
  id: string;
  tournamentId: string;
  type: string;
  rounds?: BracketRound[];
  createdAt: string;
  updatedAt: string;
}

export interface BracketRound {
  id: string;
  bracketId: string;
  roundNumber: number;
  name?: string;
  matches?: Match[];
  createdAt: string;
}

// ============================================
// View Types (for bracket display)
// ============================================

export interface BracketView {
  id: string;
  type: string;
  rounds: BracketRoundView[];
}

export interface BracketRoundView {
  id: string;
  name?: string;
  roundNumber: number;
  matches: BracketMatchView[];
}

export interface BracketMatchView {
  id: string;
  matchNumber: number;
  teamA: BracketTeamView | null;
  teamB: BracketTeamView | null;
  winner: BracketTeamView | null;
  status: MatchStatus;
  nextMatchId?: string;
}

export interface BracketTeamView {
  id: string;
  name: string;
  logoUrl?: string;
  score?: number;
}

// ============================================
// Statistics Types
// ============================================

export interface TournamentStats {
  totalTeams: number;
  totalMatches: number;
  teams: TeamStats[];
  matchStats: Record<string, number>;
}

export interface TeamStats {
  id: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
}

// ============================================
// Import Result Type
// ============================================

export interface ImportTeamsResult {
  imported: number;
  skipped: number;
  errors: string[];
  teams: TournamentTeam[];
}

// ============================================
// SSE Event Types
// ============================================

export type TournamentEvent =
  | { type: 'match_score_update'; data: Match }
  | { type: 'match_started'; data: Match }
  | { type: 'match_completed'; data: Match }
  | { type: 'match_cancelled'; data: Match }
  | { type: 'bracket_updated'; data: { tournamentId: string } }
  | { type: 'tournament_updated'; data: Tournament };

// ============================================
// Sport Display Helpers
// ============================================

export const SportTypeLabels: Record<SportType, string> = {
  [SportType.FUTSAL]: 'Futsal',
  [SportType.BASKET]: 'Basket',
  [SportType.VOLLEY]: 'Volleyball',
  [SportType.BADMINTON]: 'Badminton',
  [SportType.CHESS]: 'Chess',
  [SportType.ESPORTS]: 'E-Sports',
  [SportType.OTHER]: 'Other',
};

export const TournamentFormatLabels: Record<TournamentFormat, string> = {
  [TournamentFormat.SINGLE_ELIM]: 'Single Elimination',
  [TournamentFormat.DOUBLE_ELIM]: 'Double Elimination',
  [TournamentFormat.ROUND_ROBIN]: 'Round Robin',
  [TournamentFormat.SWISS]: 'Swiss System',
  [TournamentFormat.GROUP_KNOCKOUT]: 'Group + Knockout',
};

export const MatchStatusLabels: Record<MatchStatus, string> = {
  [MatchStatus.SCHEDULED]: 'Scheduled',
  [MatchStatus.ONGOING]: 'Live',
  [MatchStatus.COMPLETED]: 'Completed',
  [MatchStatus.CANCELLED]: 'Cancelled',
  [MatchStatus.WALKOVER]: 'Walkover',
};

export const TournamentStatusLabels: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: 'Draft',
  [TournamentStatus.IN_PROGRESS]: 'In Progress',
  [TournamentStatus.COMPLETED]: 'Completed',
  [TournamentStatus.CANCELLED]: 'Cancelled',
};
