import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsArray, Max, Min, ValidateIf } from 'class-validator';
import { EventBackgroundType } from '@prisma/client';

export interface CustomCategory {
  value: string;
  label: string;
  color: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.date !== null && o.date !== '')
  @IsDateString()
  date?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.time !== null)
  @IsString()
  time?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.location !== null)
  @IsString()
  location?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.logoUrl !== null)
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsEnum(EventBackgroundType)
  backgroundType?: EventBackgroundType;

  @IsOptional()
  @ValidateIf((o) => o.backgroundImageUrl !== null)
  @IsString()
  backgroundImageUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.backgroundVideoUrl !== null)
  @IsString()
  backgroundVideoUrl?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  overlayOpacity?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(600000)
  checkinPopupTimeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  enablePhotoCapture?: boolean;

  @IsOptional()
  @IsBoolean()
  enableLuckyDraw?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSouvenir?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDuplicateGuestId?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultipleCheckin?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxCheckinCount?: number;

  @IsOptional()
  @IsBoolean()
  allowMultipleCheckinPerCounter?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCheckinForSouvenir?: boolean;

  @IsOptional()
  @IsArray()
  customCategories?: CustomCategory[];

  @IsOptional()
  @ValidateIf((o) => o.rollSoundUrl !== null)
  @IsString()
  rollSoundUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.tensionSoundUrl !== null)
  @IsString()
  tensionSoundUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.winSoundUrl !== null)
  @IsString()
  winSoundUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.grandWinSoundUrl !== null)
  @IsString()
  grandWinSoundUrl?: string | null;
}
