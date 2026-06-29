import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamMemberDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  jerseyNumber?: string;

  @IsString()
  @IsOptional()
  guestId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  role?: string;
}

export class CreateTeamDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  seed?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeamMemberDto)
  @IsOptional()
  members?: CreateTeamMemberDto[];
}
