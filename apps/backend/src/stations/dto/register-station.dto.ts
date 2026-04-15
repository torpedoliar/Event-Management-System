import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class RegisterStationDto {
  @IsUUID()
  @IsOptional()
  stationId?: string; // UUID - optional for new stations

  @IsString()
  stationName: string;

  @IsUUID()
  eventId: string;
}
