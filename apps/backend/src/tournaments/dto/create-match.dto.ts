import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMatchDto {
  @IsOptional()
  @IsString()
  teamAId?: string;

  @IsOptional()
  @IsString()
  teamBId?: string;

  @IsOptional()
  @IsString()
  roundId?: string;

  @IsOptional()
  @IsString()
  court?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
