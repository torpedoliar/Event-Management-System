import { IsString, IsOptional, IsDateString } from 'class-validator';

export class OfflineCheckinDto {
  @IsString()
  stationId: string;

  @IsString()
  guestIdentifier: string; // guestId or UUID from QR

  @IsDateString()
  clientTimestamp: string;

  @IsString()
  @IsOptional()
  photo?: string; // Base64 encoded photo (optional)
}

export class SyncBatchItemDto {
  @IsString()
  guestIdentifier: string;

  @IsDateString()
  clientTimestamp: string;

  @IsString()
  @IsOptional()
  photo?: string;
}

export class SyncBatchDto {
  @IsString()
  stationId: string;

  @IsDateString()
  @IsOptional()
  lastSyncAt?: string;

  @IsOptional()
  pendingCheckins?: SyncBatchItemDto[];
}
