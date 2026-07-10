import { IsOptional, IsString, IsBoolean, IsInt, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrationFieldDto {
  @IsString()
  @MaxLength(50)
  key!: string;

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsBoolean()
  required!: boolean;

  @IsString()
  @MaxLength(20)
  type!: string; // 'text' | 'textarea'

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;
}

export class UpdateRegistrationConfigDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuota?: number;

  @IsOptional()
  @IsString()
  openAt?: string | null;

  @IsOptional()
  @IsString()
  closeAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  successMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  closedMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fullMessage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrationFieldDto)
  fields?: RegistrationFieldDto[];

  @IsOptional()
  @IsBoolean()
  preventDuplicates?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestIdPrefix?: string;
}
