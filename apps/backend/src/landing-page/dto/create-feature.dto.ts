import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
