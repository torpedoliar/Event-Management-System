import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class TournamentCheckinDto {
  @IsString()
  guestId!: string;

  @IsString()
  @IsOptional()
  adminId?: string;

  @IsString()
  @IsOptional()
  adminName?: string;

  @IsString()
  @IsOptional()
  counterName?: string;
}

export class OfflineTournamentCheckinDto {
  @IsString()
  guestId!: string;

  @IsString()
  @IsOptional()
  adminId?: string;

  @IsString()
  @IsOptional()
  adminName?: string;

  @IsString()
  @IsOptional()
  counterName?: string;

  @IsBoolean()
  isOffline!: boolean;

  @IsString()
  clientTimestamp!: string;
}

export class TournamentCheckinBatchSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineTournamentCheckinDto)
  checkins!: OfflineTournamentCheckinDto[];
}
