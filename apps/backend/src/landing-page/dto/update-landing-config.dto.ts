import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateLandingConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroHeadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  heroSubtext?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  heroCtaPrimary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  heroCtaSecondary?: string;

  @IsOptional()
  @IsBoolean()
  showHero?: boolean;

  @IsOptional()
  @IsBoolean()
  showFeatures?: boolean;

  @IsOptional()
  @IsBoolean()
  showGallery?: boolean;

  @IsOptional()
  @IsBoolean()
  showFooter?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  galleryTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  gallerySubtext?: string;
}
