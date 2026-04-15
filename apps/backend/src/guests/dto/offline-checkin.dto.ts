import { IsString, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OfflineCheckinDto {
  @IsString()
  stationId!: string;

  @IsString()
  guestIdentifier!: string;

  @IsDateString()
  clientTimestamp!: string;

  @IsString()
  @IsOptional()
  photo?: string;
}

export class SyncBatchItemDto {
  @IsString()
  guestIdentifier!: string;

  @IsDateString()
  clientTimestamp!: string;

  @IsString()
  @IsOptional()
  photo?: string;
}

export class SyncBatchDto {
  @IsString()
  stationId!: string;

  @IsDateString()
  @IsOptional()
  lastSyncAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchItemDto)
  @IsOptional()
  pendingCheckins?: SyncBatchItemDto[];
}
