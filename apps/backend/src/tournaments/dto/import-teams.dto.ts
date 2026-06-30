import { IsString, IsOptional, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportTeamMemberDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  jerseyNumber?: string;

  @IsString()
  @IsOptional()
  guestId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  role?: string;
}

export class ImportTeamDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  seed?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTeamMemberDto)
  @IsOptional()
  members?: ImportTeamMemberDto[];
}

export class ImportTeamsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTeamDto)
  teams!: ImportTeamDto[];
}
