import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDateString,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SportType,
  TournamentFormat,
  ParticipantType,
  ScoringMode,
  SchedulingMode,
  ScoringConfig,
} from '../types/tournament.types';

export class CreateTournamentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(SportType)
  sportType!: SportType;

  @IsEnum(TournamentFormat)
  formatType!: TournamentFormat;

  @IsEnum(ParticipantType)
  participantType!: ParticipantType;

  @IsEnum(ScoringMode)
  @IsOptional()
  scoringMode?: ScoringMode;

  @IsObject()
  @IsOptional()
  scoringConfig?: ScoringConfig;

  @IsEnum(SchedulingMode)
  @IsOptional()
  schedulingMode?: SchedulingMode;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  courtCount?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsBoolean()
  @IsOptional()
  enableMatchCheckin?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  checkinWindowMinutes?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  checkinCloseMinutes?: number;
}
