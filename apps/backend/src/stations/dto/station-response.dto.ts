import { IsString, IsOptional, IsBoolean, IsUUID, IsNumber } from 'class-validator';

export class StationResponseDto {
  id!: string;
  name!: string;
  stationId!: string;
  eventId!: string;
  isActive!: boolean;
  lastSyncAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  checkinCount?: number;
}

export class ListStationsResponseDto {
  stations!: StationResponseDto[];
  total!: number;
}
