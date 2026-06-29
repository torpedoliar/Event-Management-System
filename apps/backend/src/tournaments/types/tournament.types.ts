// Tournament System Type Definitions

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

export interface ScoringConfig {
  maxSets?: number;
  targetPoints?: number;
}
