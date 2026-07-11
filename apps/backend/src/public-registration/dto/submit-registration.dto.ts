import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitRegistrationDto {
  // Dynamic field values keyed by field key (e.g. { name: "Budi", company: "PT X" })
  // The service validates these against the configured fields.
  @IsObject()
  data!: Record<string, string>;

  // Honeypot field — must be empty (bots fill hidden fields)
  @IsOptional()
  @IsString()
  website?: string;

  // Optional event ID — if not provided, falls back to the active event
  @IsOptional()
  @IsString()
  eventId?: string;
}
