import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateScoreDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  scoreA!: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  scoreB!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  setsA?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  setsB?: number;
}
