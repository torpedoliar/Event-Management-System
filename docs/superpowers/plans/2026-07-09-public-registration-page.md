# Public Registration Page Implementation Plan

> **For agentic workers (Claude, etc.):** This plan is fully self-contained. Read the "Codebase Context" section first — it contains everything you need to know about the project structure, conventions, and patterns to follow. Implement tasks in order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah halaman registrasi publik (`/register`) yang terintegrasi ke data tamu undangan (Guest). Pendaftar publik disimpan langsung sebagai record `Guest` dengan `registrationSource: 'PUBLIC'` dan `checkedIn: false`, sehingga langsung muncul di admin guest list dan bisa check-in, lucky draw, souvenir, dll. Admin bisa mengatur (on/off) registrasi publik lewat settings, menentukan kuota peserta, window waktu pendaftaran, dan **menyusun field form sendiri** (nama, ID, Perusahaan, No. HP, dll — fully configurable). Field yang tidak ditampilkan otomatis diisi `null` saat create Guest. Tidak ada approval pendaftar (auto-approve, RSVP style). Tidak ada throttling (lingkungan NAT).

**Architecture:** Monorepo dengan `apps/backend` (NestJS 10 + Prisma + PostgreSQL) dan `apps/frontend` (Next.js 15 App Router + Tailwind CSS). Plan ini menambah modul `public-registration/` di backend (mengikuti pola modul `landing-page/` yang sudah ada — config 1:1 dengan Event, public GET tanpa auth, admin GET/PUT dengan JWT). Pendaftar publik dibuat via `GuestsService.create()` yang sudah ada (reuse logic queue number, table default, dll). Toggle `enablePublicRegistration` ditambah ke model `Event` (mengikuti pola `enableLuckyDraw`/`enableSouvenir`). Definisi field form disimpan sebagai JSONB array `fields` di model `PublicRegistrationConfig` (mengikuti preseden `customCategories` JSONB di model Event). Enum `RegistrationSource` ditambah value `PUBLIC`.

**Tech Stack:** Next.js 15 (frontend, App Router, Client Components), NestJS 10 (backend), PostgreSQL (database), Prisma 5 (ORM), class-validator + class-transformer (DTO validation), JWT (admin auth), Tailwind CSS (styling, brand tokens), Lucide React (icons).

---

## Codebase Context (READ THIS FIRST)

You are working on a Guest Registration & Check-in System (event management platform). The codebase is a monorepo at `E:\Vibe\Registrasi Tamu`.

### Project Structure

```
E:\Vibe\Registrasi Tamu\
├── apps/
│   ├── backend/                          # NestJS API + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # Database schema (MODIFY)
│   │   │   └── migrations/               # Auto-generated migrations
│   │   ├── src/
│   │   │   ├── app.module.ts             # Root module (MODIFY - add new module)
│   │   │   ├── landing-page/             # <- PATTERN TO FOLLOW for new module
│   │   │   │   ├── landing-page.module.ts
│   │   │   │   ├── landing-page.controller.ts
│   │   │   │   ├── landing-page.service.ts
│   │   │   │   └── dto/
│   │   │   ├── guests/
│   │   │   │   ├── guests.service.ts     # <- has create() method to REUSE
│   │   │   │   ├── guests.controller.ts  # MODIFY - add PUBLIC to formatSource helpers
│   │   │   │   └── dto/create-guest.dto.ts
│   │   │   ├── events/events.service.ts  # <- has getActive() to REUSE
│   │   │   ├── public/public.controller.ts  # uses @SkipThrottle at class level
│   │   │   └── common/throttler/throttler.config.ts
│   │   └── package.json  # has class-validator, class-transformer, @nestjs/throttler
│   └── frontend/                         # Next.js App Router
│       ├── app/
│       │   ├── (main)/                   # route group WITH TopNav layout
│       │   │   ├── admin/
│       │   │   │   ├── settings/
│       │   │   │   │   ├── event/page.tsx        # MODIFY - add toggle + link card
│       │   │   │   │   └── landing-page/page.tsx # <- PATTERN for admin settings page

### Key Patterns to Follow

1. **Landing Page module pattern** (`apps/backend/src/landing-page/`): Closest existing pattern. Config model 1:1 with Event (`eventId @unique`), public GET (no auth), admin GET/PUT (JWT guard). Service uses `getActiveEventId()` + `getOrCreateConfig()`. **Follow this exact structure.**

2. **Event toggle pattern** (`schema.prisma` model Event): Fields like `enableLuckyDraw Boolean @default(false)`, `enableSouvenir`, `enableTournament`. Add `enablePublicRegistration Boolean @default(false)` in same area.

3. **customCategories JSONB pattern** (`schema.prisma` model Event line 100): `customCategories Json?` stores `Array<{value, label, color}>`. Frontend manages as editable array (add/remove). **Follow this for `fields` JSONB array** in `PublicRegistrationConfig`.

4. **RegistrationSource enum** (`schema.prisma` lines 136-140): Currently `MANUAL | IMPORT | WALKIN`. Add `PUBLIC`. Frontend `admin/guests/page.tsx` has `SOURCE_CONFIG` record. Backend `guests.controller.ts` has `formatSource()` and `formatSourcePdf()` switches.


---

## Global Constraints

- Follow existing codebase patterns (Landing Page module for backend, landing-page settings page for frontend admin)
- TypeScript strict mode for all new code
- **Additive migration only** (non-destructive): all new fields have `@default`, new enum value is additive
- **No throttling** on public registration endpoints (`@SkipThrottle` at controller level — NAT environment)
- **No email validation** (user requested — just store whatever is entered)
- **No approval workflow** — pendaftar langsung menjadi Guest with `checkedIn: false`
- **Field `name` is always required** and cannot be removed from form field builder
- **Field yang tidak ditampilkan → otomatis `null`** saat create Guest
- **Reuse `GuestsService.create()`** — do NOT duplicate guest creation logic
- **No emoji as icons** (use Lucide React only)
- Mobile-first responsive design (375px to 1920px+)

---

## Key Reference Files (read before starting)

| File | Why |
|------|-----|
| `apps/backend/src/landing-page/landing-page.service.ts` | Pattern for getOrCreateConfig, getActiveEventId |
| `apps/backend/src/landing-page/landing-page.controller.ts` | Pattern for mixed public/admin endpoints, JWT guard |
| `apps/backend/src/landing-page/landing-page.module.ts` | Pattern for module structure (imports EventsModule) |
| `apps/backend/src/landing-page/dto/update-landing-config.dto.ts` | Pattern for DTO validators |
| `apps/backend/src/guests/guests.service.ts` (lines 256-310) | The `create()` method to reuse |
| `apps/backend/src/guests/guests.controller.ts` (lines 232-238, 450-456, 540-543) | formatSource + formatSourcePdf + sourceColor |
| `apps/backend/prisma/schema.prisma` (lines 79-124, 126-140, 142-185, 351-382) | Schema patterns |
| `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx` | Pattern for admin settings page |
| `apps/frontend/app/(main)/admin/guests/page.tsx` (lines 13-30) | RegistrationSource type + SOURCE_CONFIG |
| `apps/frontend/app/(main)/admin/settings/event/page.tsx` (lines 39-62, 370-420) | EventConfig interface + card links |
| `apps/frontend/components/ui/Toggle.tsx` | Toggle component API |
| `apps/frontend/components/TopNav.tsx` (lines 117-130) | adminLinks + public nav links |
| `apps/frontend/lib/api.ts` | apiBase(), apiFetch(), parseErrorMessage() |

---

## Edge Cases Handled

| Edge Case | Penanganan |
|-----------|-----------|
| `isActive = false` | Halaman publik tampilkan `closedMessage`, reject submit |
| Di luar window waktu (sebelum `openAt` / setelah `closeAt`) | Tampilkan `closedMessage`, reject submit |

## Field Mapping: Configurable Form Fields to Guest Columns

The public registration form fields are configurable. Each field definition maps to a column in the `Guest` model. Here are ALL available field keys:

| Field key | Guest column | Notes |
|-----------|-------------|-------|
| `name` | name | **Always required, cannot be removed** |
| `guestId` | guestId | If not in form, auto-generate as `${prefix}-${queueNumber}` |
| `email` | email | No validation (user requested) |
| `phone` | phone | |
| `company` | company | |
| `department` | department | |
| `division` | division | |
| `tableLocation` | tableLocation | If not provided, defaults to `'-'` |
| `notes` | notes | |

**Rule:** Any Guest column NOT represented in the form fields config → set to `null` (or default) when creating the Guest record. Only fields that are both (a) in the config AND (b) filled by the user get a value.

The `fields` JSONB array structure:
```json
[
  { "key": "name", "label": "Nama Lengkap", "required": true, "type": "text", "placeholder": "Nama Anda..." },
  { "key": "guestId", "label": "ID Peserta", "required": false, "type": "text", "placeholder": "Opsional" },
  { "key": "company", "label": "Perusahaan", "required": false, "type": "text", "placeholder": "PT..." }
]
```

---

## Phase 1: Database Schema

### Task 1.1: Update Prisma schema

**File:** `apps/backend/prisma/schema.prisma`

**Goal:** Add `PUBLIC` to RegistrationSource enum, add `enablePublicRegistration` toggle to Event, add new `PublicRegistrationConfig` model, and add relation to Event.

- [ ] **Step 1: Add `PUBLIC` to RegistrationSource enum**

Find the enum (around line 136):
```prisma
enum RegistrationSource {
  MANUAL
  IMPORT
  WALKIN
}
```
Change to:
```prisma
enum RegistrationSource {
  MANUAL
  IMPORT
  WALKIN
  PUBLIC
}
```

- [ ] **Step 2: Add `enablePublicRegistration` toggle + relation to model Event**

In `model Event`, after the `enableTournament` line (around line 114), add:
```prisma
  // Public registration settings
  enablePublicRegistration Boolean            @default(false)  // Enable public registration page
```

And in the relations section of `model Event` (after `landingPageConfig LandingPageConfig?` around line 122), add:
```prisma
  publicRegistrationConfig PublicRegistrationConfig?
```

- [ ] **Step 3: Add `PublicRegistrationConfig` model**

Add this model AFTER `model LandingPageConfig` (after line ~382, or anywhere after the LandingPage models):
```prisma
model PublicRegistrationConfig {
  id                String    @id @default(uuid())
  eventId           String    @unique
  event             Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Control
  isActive          Boolean   @default(false)   // on/off main switch
  maxQuota          Int       @default(0)       // 0 = unlimited
  openAt            DateTime?                   // null = open immediately
  closeAt           DateTime?                   // null = until event

  // Form content
  title             String    @default("Registrasi Peserta")
  description       String?   @db.Text
  successMessage    String    @default("Terima kasih, registrasi Anda berhasil!")
  closedMessage     String    @default("Pendaftaran telah ditutup.")
  fullMessage       String    @default("Kuota pendaftaran telah penuh.")

  // Configurable form fields (JSONB array of { key, label, required, type, placeholder })
  // key: one of Guest column names (name, guestId, email, phone, company, department, division, tableLocation, notes)
  // type: 'text' | 'textarea'

## Phase 2: Backend Module

### Task 2.1: Create DTO files

**Files (CREATE):**
- `apps/backend/src/public-registration/dto/update-registration-config.dto.ts`
- `apps/backend/src/public-registration/dto/submit-registration.dto.ts`

- [ ] **Step 1: Create `update-registration-config.dto.ts`**

```typescript
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

### Task 2.2: Create the service

**File (CREATE):** `apps/backend/src/public-registration/public-registration.service.ts`

Follows `LandingPageService` pattern (getActiveEventId + getOrCreateConfig).

- [ ] **Step 1: Create service — imports, class, and helper methods**

```typescript
import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { GuestsService } from '../guests/guests.service';
import { UpdateRegistrationConfigDto } from './dto/update-registration-config.dto';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';

const VALID_FIELD_KEYS = ['name', 'guestId', 'email', 'phone', 'company', 'department', 'division', 'tableLocation', 'notes'];

interface RegistrationField {
  key: string;
  label: string;
  required: boolean;
  type: string;
  placeholder?: string;
}

@Injectable()
export class PublicRegistrationService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private guests: GuestsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async getActiveEventId(): Promise<string> {
    const event = await this.events.getActive();
    if (!event) throw new NotFoundException('No active event');
    return event.id;
  }

  private async getOrCreateConfig(eventId: string) {
    let config = await this.prisma.publicRegistrationConfig.findUnique({
      where: { eventId },
    });
    if (!config) {
      config = await this.prisma.publicRegistrationConfig.create({
        data: {
          eventId,
          fields: [
            { key: 'name', label: 'Nama Lengkap', required: true, type: 'text', placeholder: 'Nama lengkap Anda' },
          ] as any,
        },
      });
    }
    return config;
  }

  private isRegistrationOpen(config: any): { open: boolean; reason?: string } {
    if (!config.isActive) return { open: false, reason: 'closed' };
    const now = new Date();
    if (config.openAt && now < new Date(config.openAt)) return { open: false, reason: 'closed' };
    if (config.closeAt && now > new Date(config.closeAt)) return { open: false, reason: 'closed' };
    return { open: true };
  }

  private async countPublicRegistrants(eventId: string): Promise<number> {
    return this.prisma.guest.count({
      where: { eventId, registrationSource: 'PUBLIC' },
    });
  }
```

- [ ] **Step 2: Add getPublicConfig + getAdminConfig methods**

Continue the class (after the helpers above):

```typescript
  // Public: get config for rendering the form (no sensitive data)
  async getPublicConfig() {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);
    const currentCount = await this.countPublicRegistrants(eventId);
    const { open, reason } = this.isRegistrationOpen(config);
    const isFull = config.maxQuota > 0 && currentCount >= config.maxQuota;

    return {
      isActive: config.isActive,
      isOpen: open,
      reason: !open ? reason : (isFull ? 'full' : null),
      maxQuota: config.maxQuota,

- [ ] **Step 3: Add updateConfig method**

Continue the class (after getAdminConfig):

```typescript
  // Admin: update config
  async updateConfig(dto: UpdateRegistrationConfigDto) {
    const eventId = await this.getActiveEventId();
    const existing = await this.getOrCreateConfig(eventId);

    const data: any = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.maxQuota !== undefined) data.maxQuota = dto.maxQuota;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.successMessage !== undefined) data.successMessage = dto.successMessage;
    if (dto.closedMessage !== undefined) data.closedMessage = dto.closedMessage;
    if (dto.fullMessage !== undefined) data.fullMessage = dto.fullMessage;
    if (dto.preventDuplicates !== undefined) data.preventDuplicates = dto.preventDuplicates;
    if (dto.guestIdPrefix !== undefined) data.guestIdPrefix = dto.guestIdPrefix;

    if (dto.openAt !== undefined) {
      data.openAt = dto.openAt === null || dto.openAt === '' ? null : new Date(dto.openAt);
    }
    if (dto.closeAt !== undefined) {
      data.closeAt = dto.closeAt === null || dto.closeAt === '' ? null : new Date(dto.closeAt);
    }

    if (dto.fields !== undefined) {
      for (const field of dto.fields) {
        if (!VALID_FIELD_KEYS.includes(field.key)) {
          throw new BadRequestException(`Field key "${field.key}" is not valid. Valid keys: ${VALID_FIELD_KEYS.join(', ')}`);
        }
        if (field.type !== 'text' && field.type !== 'textarea') {
          throw new BadRequestException(`Field type must be 'text' or 'textarea'`);
        }
      }
      // Ensure 'name' field is always present and required
      if (!dto.fields.some(f => f.key === 'name')) {
        dto.fields.unshift({ key: 'name', label: 'Nama Lengkap', required: true, type: 'text' } as any);
      }
      dto.fields = dto.fields.map(f => f.key === 'name' ? { ...f, required: true } : f);
      data.fields = dto.fields as any;
    }

    return this.prisma.publicRegistrationConfig.update({
      where: { eventId },
      data,
    });
  }
```

- [ ] **Step 4: Add submitRegistration + getStats methods (close the class)**

Continue and close the class:

```typescript
  // Public: submit a registration
  async submitRegistration(dto: SubmitRegistrationDto) {
    // Honeypot: if website field filled, silently reject (bot)
    if (dto.website) {
      return { success: true, message: 'Terima kasih!', guestId: null, queueNumber: null };
    }

    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

    const { open } = this.isRegistrationOpen(config);
    if (!open) throw new BadRequestException(config.closedMessage);

    if (config.maxQuota > 0) {
      const currentCount = await this.countPublicRegistrants(eventId);
      if (currentCount >= config.maxQuota) throw new BadRequestException(config.fullMessage);
    }

    const fields = (config.fields as RegistrationField[]) || [];
    const input: any = {};
    for (const field of fields) {
      const value = (dto.data?.[field.key] ?? '').trim();
      if (field.required && !value) {
        throw new BadRequestException(`Field "${field.label}" wajib diisi`);
      }
      if (value) input[field.key] = value;
    }
    if (!input.name) throw new BadRequestException('Nama wajib diisi');

    // Auto-generate guestId if not provided via form
    const needsAutoGuestId = !fields.some(f => f.key === 'guestId') || !input.guestId;
    if (needsAutoGuestId) {
      const queueNumber = await this.guests.nextQueueNumber(eventId);
      input.guestId = `${config.guestIdPrefix}-${queueNumber}`;
    }

    // Check duplicates if enabled
    if (config.preventDuplicates) {
      const conditions: any[] = [];
      for (const field of fields) {
        if (input[field.key]) conditions.push({ [field.key]: input[field.key] });
      }
      if (conditions.length > 0) {
        const existing = await this.prisma.guest.findFirst({ where: { eventId, OR: conditions } });
        if (existing) throw new ConflictException('Anda sudah terdaftar dengan data yang sama');
      }
    }

    // Create guest via existing GuestsService (reuses queue number, table default, etc.)
    const guest = await this.guests.create(input, undefined, true, 'PUBLIC');

    return {
      success: true,
      message: config.successMessage,
      guestId: guest.guestId,
      queueNumber: guest.queueNumber,
    };
  }

### Task 2.3: Create the controller

**File (CREATE):** `apps/backend/src/public-registration/public-registration.controller.ts`

Follows `LandingPageController` pattern (`@Controller()` no prefix, path on each method). Uses `@SkipThrottle` at class level (NAT environment).

```typescript
import { Controller, Get, Put, Post, Body, Res, UseGuards, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { PublicRegistrationService } from './public-registration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateRegistrationConfigDto } from './dto/update-registration-config.dto';
import { SubmitRegistrationDto } from './dto/submit-registration.dto';

@SkipThrottle({ default: true, short: true, medium: true, long: true })
@Controller()
export class PublicRegistrationController {
  private readonly logger = new Logger(PublicRegistrationController.name);

  constructor(private readonly service: PublicRegistrationService) {}

  // --- Public API (no auth) ---

  @Get('public/registration/config')
  async getPublicConfig(@Res() res: Response) {
    const data = await this.service.getPublicConfig();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json(data);
  }

  @Post('public/registration/submit')
  async submitRegistration(@Body() dto: SubmitRegistrationDto) {
    try {
      return await this.service.submitRegistration(dto);
    } catch (error: any) {
      this.logger.error(`submitRegistration failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Admin API (JWT) ---

  @UseGuards(JwtAuthGuard)
  @Get('admin/public-registration')
  getAdminConfig() {
    return this.service.getAdminConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/public-registration')
  async updateConfig(@Body() dto: UpdateRegistrationConfigDto) {
    try {
      return await this.service.updateConfig(dto);
    } catch (error: any) {
      this.logger.error(`updateConfig failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/public-registration/stats')
  getStats() {
    return this.service.getStats();
  }
}
```

---

### Task 2.4: Create the module

**File (CREATE):** `apps/backend/src/public-registration/public-registration.module.ts`

## Phase 3: Backend Integration Changes

### Task 3.1: Register module in app.module.ts

**File (MODIFY):** `apps/backend/src/app.module.ts`

- [ ] **Step 1:** Add import after the `LandingPageModule` import (line ~18):
```typescript
import { PublicRegistrationModule } from './public-registration/public-registration.module';
```

- [ ] **Step 2:** Add `PublicRegistrationModule` to the `imports` array (after `LandingPageModule`, line ~44):
```typescript
    LandingPageModule,
    PublicRegistrationModule,
    TournamentsModule,
```

### Task 3.2: Add 'PUBLIC' to GuestsService.create signature

**File (MODIFY):** `apps/backend/src/guests/guests.service.ts`

- [ ] **Step 1:** Find line 256 — the `create` method signature:
```typescript
async create(input: CreateGuestDto, photoUrl?: string, skipDuplicateCheck?: boolean, registrationSource?: 'MANUAL' | 'IMPORT' | 'WALKIN') {
```
Change to:
```typescript
async create(input: CreateGuestDto, photoUrl?: string, skipDuplicateCheck?: boolean, registrationSource?: 'MANUAL' | 'IMPORT' | 'WALKIN' | 'PUBLIC') {
```
(No other changes needed — `registrationSource` is written directly to DB on line 296.)

### Task 3.3: Add 'PUBLIC' to formatSource helpers in guests.controller.ts

**File (MODIFY):** `apps/backend/src/guests/guests.controller.ts`

- [ ] **Step 1:** Find `formatSource` function (around line 232). Add case before `default`:
```typescript
case 'PUBLIC': return 'Public (Registrasi)';
```

- [ ] **Step 2:** Find `formatSourcePdf` function (around line 450). Add case before `default`:
```typescript
case 'PUBLIC': return 'Public';
```

- [ ] **Step 3:** Find `sourceColor` line (around line 542):
```typescript
const sourceColor = guest.registrationSource === 'WALKIN' ? '#f97316' : guest.registrationSource === 'IMPORT' ? '#3b82f6' : '#6b7280';
```
Change to:
```typescript
const sourceColor = guest.registrationSource === 'WALKIN' ? '#f97316' : guest.registrationSource === 'IMPORT' ? '#3b82f6' : guest.registrationSource === 'PUBLIC' ? '#10b981' : '#6b7280';
```

### Task 3.4: Build backend to verify

- [ ] **Step 1:** From `apps/backend` directory, run:
```bash
npm run build
```
Must pass with zero TypeScript errors. Fix any issues before proceeding.

---

## Phase 4: Frontend — Public Registration Page

### Task 4.1: Create the public registration page

**File (CREATE):** `apps/frontend/app/(main)/register/page.tsx`

**Goal:** Client component in route group `(main)` (has TopNav). Fetches config, renders dynamic form based on `fields` config, handles closed/full/success states.

- [ ] **Step 1: Create page — imports, interfaces, state, and data fetching**

```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import Button from "@/components/ui/Button";
import { UserPlus, Loader2, CheckCircle, XCircle, Users, Clock } from "lucide-react";

interface RegistrationField {
  key: string; label: string; required: boolean; type: string; placeholder?: string;
}
interface PublicConfig {
  isActive: boolean; isOpen: boolean; reason: string | null;
  maxQuota: number; currentCount: number; remainingQuota: number | null;
  fields: RegistrationField[]; title: string; description?: string | null;
  successMessage: string; closedMessage: string; fullMessage: string;
}
type PageState = "loading" | "form" | "closed" | "full" | "success" | "error";

export default function PublicRegistrationPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; guestId: string | null; queueNumber: number | null } | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/public/registration/config`);
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      const data: PublicConfig = await res.json();
      setConfig(data);
      if (!data.isOpen && data.reason === "full") setState("full");
      else if (!data.isOpen) setState("closed");
      else setState("form");
    } catch (e: any) {
      setErrorMsg(e.message); setState("error");
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setErrorMsg(null);
    try {
      const res = await fetch(`${apiBase()}/public/registration/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

- [ ] **Step 2: Add state rendering (loading, error, closed, full, success)**

Continue the component (after handleSubmit):

```tsx
  // Loading
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }
  // Error
  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <XCircle className="mx-auto text-brand-danger" size={48} />
          <h2 className="text-xl font-bold text-brand-text">Gagal Memuat</h2>
          <p className="text-brand-textMuted text-sm">{errorMsg}</p>
          <Button variant="secondary" onClick={fetchConfig}>Coba Lagi</Button>
        </Card>
      </div>
    );
  }
  // Closed
  if (state === "closed" && config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <Clock className="mx-auto text-brand-textMuted" size={48} />
          <h2 className="text-xl font-bold text-brand-text">{config.title}</h2>
          <p className="text-brand-textMuted">{config.closedMessage}</p>
        </Card>
      </div>
    );
  }
  // Full
  if (state === "full" && config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-4">
          <Users className="mx-auto text-brand-warning" size={48} />
          <h2 className="text-xl font-bold text-brand-text">{config.title}</h2>
          <p className="text-brand-textMuted">{config.fullMessage}</p>
        </Card>
      </div>
    );
  }
  // Success
  if (state === "success" && successData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="elevated" className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="mx-auto text-brand-success" size={56} />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-brand-text">Registrasi Berhasil!</h2>
            <p className="text-brand-textMuted">{successData.message}</p>
          </div>
          {successData.guestId && (
            <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 space-y-2">
              <div className="text-xs text-brand-textMuted uppercase tracking-wider">ID Peserta</div>
              <div className="text-2xl font-bold font-mono text-brand-primary">{successData.guestId}</div>
              {successData.queueNumber !== null && (
                <div className="text-sm text-brand-textMuted">No. Antrian: {successData.queueNumber}</div>
              )}
            </div>
          )}
          <p className="text-xs text-brand-textMuted">Simpan ID Peserta Anda untuk check-in di lokasi acara.</p>
        </Card>
      </div>

- [ ] **Step 3: Add the form rendering (continue + close the component)**

```tsx
  // Form (default)
  const quotaPct = config && config.maxQuota > 0
    ? Math.min(100, (config.currentCount / config.maxQuota) * 100) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
            <UserPlus className="text-brand-primary" size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-text">{config?.title}</h1>
          {config?.description && <p className="text-brand-textMuted text-sm">{config.description}</p>}
        </div>

        {/* Quota progress */}
        {config && config.maxQuota > 0 && (
          <Card variant="glass" className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-brand-textMuted flex items-center gap-2"><Users size={16} /> Kuota</span>
              <span className="text-brand-text font-medium">{config.currentCount} / {config.maxQuota}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${quotaPct}%` }} />
            </div>
            {config.remainingQuota !== null && config.remainingQuota > 0 && (
              <p className="text-xs text-brand-textMuted">Tersisa {config.remainingQuota} slot</p>
            )}
          </Card>
        )}

        {/* Form */}
        <Card variant="elevated" className="space-y-5">
          {errorMsg && (
            <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">{errorMsg}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {config?.fields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={`field-${field.key}`} className="mb-2">
                  {field.label}{field.required && <span className="text-brand-danger ml-1">*</span>}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea id={`field-${field.key}`} value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder || ""} required={field.required} rows={3} />
                ) : (
                  <Input id={`field-${field.key}`} type="text" value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder || ""} required={field.required} />
                )}
              </div>
            ))}
            {/* Honeypot (hidden from humans) */}
            <input type="text" name="website" value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: "absolute", left: "-9999px", opacity: 0 }} tabIndex={-1} autoComplete="off" />
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {submitting ? "Mendaftarkan..." : "Daftar Sekarang"}
            </Button>
          </form>
        </Card>
      </div>

## Phase 5: Frontend — Admin Settings (Field Builder)

### Task 5.1: Create admin settings page for public registration

**File (CREATE):** `apps/frontend/app/(main)/admin/settings/public-registration/page.tsx`

**Goal:** Admin can toggle on/off, set quota, time window, form content, and **build custom form fields** (add/remove/reorder). Follows `landing-page/page.tsx` pattern.

- [ ] **Step 1: Create page — imports, interfaces, and state**

```tsx
"use client";
import RequireAuth from "@/components/RequireAuth";
import { useEffect, useState, useCallback } from "react";
import { apiBase, parseErrorMessage } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Select from "@/components/ui/Select";
import { Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Settings, Users, Clock, FileText, ListPlus, BarChart3 } from "lucide-react";

interface RegField { key: string; label: string; required: boolean; type: string; placeholder?: string; }
interface RegConfig {
  isActive: boolean; maxQuota: number; openAt: string | null; closeAt: string | null;
  title: string; description: string | null;
  successMessage: string; closedMessage: string; fullMessage: string;
  fields: RegField[]; preventDuplicates: boolean; guestIdPrefix: string;
}
interface RegStats {
  isActive: boolean; isOpen: boolean; maxQuota: number;
  currentCount: number; remainingQuota: number | null; isFull: boolean;
}

const FIELD_KEY_OPTIONS = [
  { value: "name", label: "Nama" }, { value: "guestId", label: "ID Peserta" },
  { value: "email", label: "Email" }, { value: "phone", label: "No. HP / Telepon" },
  { value: "company", label: "Perusahaan / Organisasi" }, { value: "department", label: "Departemen" },
  { value: "division", label: "Divisi" }, { value: "tableLocation", label: "Meja / Lokasi" },
  { value: "notes", label: "Catatan" },
];

const DEFAULT_CONFIG: RegConfig = {
  isActive: false, maxQuota: 0, openAt: null, closeAt: null,
  title: "Registrasi Peserta", description: "",
  successMessage: "Terima kasih, registrasi Anda berhasil!",
  closedMessage: "Pendaftaran telah ditutup.",
  fullMessage: "Kuota pendaftaran telah penuh.",
  fields: [{ key: "name", label: "Nama Lengkap", required: true, type: "text", placeholder: "Nama lengkap Anda" }],
  preventDuplicates: false, guestIdPrefix: "PUB",
};

export default function PublicRegistrationSettingsPage() {
  const [config, setConfig] = useState<RegConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<RegStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tokenHeader = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`${apiBase()}/admin/public-registration`, { headers: tokenHeader() }),
        fetch(`${apiBase()}/admin/public-registration/stats`, { headers: tokenHeader() }),
      ]);
      if (!cfgRes.ok) throw new Error(parseErrorMessage(await cfgRes.text()));
      const cfgData = await cfgRes.json();

- [ ] **Step 2: Add field builder handlers + save handler + loading state**

```tsx
  // Field builder helpers
  const addField = () => {
    const usedKeys = config.fields.map(f => f.key);
    const available = FIELD_KEY_OPTIONS.find(o => !usedKeys.includes(o.value));
    if (!available) { setError("Semua field sudah ditambahkan"); return; }
    setConfig({ ...config, fields: [...config.fields, { key: available.value, label: available.label, required: false, type: "text", placeholder: "" }] });
  };
  const removeField = (index: number) => {
    if (config.fields[index]?.key === "name") { setError("Field 'Nama' tidak bisa dihapus"); return; }
    setConfig({ ...config, fields: config.fields.filter((_, i) => i !== index) });
  };
  const updateField = (index: number, updates: Partial<RegField>) => {
    setConfig({ ...config, fields: config.fields.map((f, i) => i === index ? { ...f, ...updates } : f) });
  };
  const moveField = (index: number, dir: "up" | "down") => {
    const newFields = [...config.fields];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    setConfig({ ...config, fields: newFields });
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setMessage(null);
    try {
      const res = await fetch(`${apiBase()}/admin/public-registration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ ...config, openAt: config.openAt || null, closeAt: config.closeAt || null }),
      });
      if (!res.ok) throw new Error(parseErrorMessage(await res.text()));
      setMessage("Pengaturan berhasil disimpan");
      fetchData();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Loader2 className="animate-spin text-brand-primary" size={32} />
        </div>

- [ ] **Step 3: Add stats card + status/quota section (render start)**

```tsx
  return (
    <RequireAuth>
      <div className="min-h-screen p-6 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Settings size={28} className="text-brand-primary" />
              Registrasi Publik
            </h1>
          </div>

          {error && <div className="text-sm text-brand-danger bg-brand-danger/10 p-3 rounded-lg border border-brand-danger/20">{error}</div>}
          {message && <div className="text-sm text-brand-success bg-brand-success/10 p-3 rounded-lg border border-brand-success/20">{message}</div>}

          {/* Stats */}
          {stats && (
            <Card variant="glass" className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 size={20} className="text-brand-primary" />
                <h3 className="font-semibold text-brand-text">Statistik</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-brand-text">{stats.currentCount}</div>
                  <div className="text-xs text-brand-textMuted">Pendaftar</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-brand-text">{stats.maxQuota > 0 ? stats.maxQuota : "~"}</div>
                  <div className="text-xs text-brand-textMuted">Kuota</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className={`text-2xl font-bold ${stats.isOpen ? "text-brand-success" : "text-brand-textMuted"}`}>{stats.isOpen ? "Buka" : "Tutup"}</div>
                  <div className="text-xs text-brand-textMuted">Status</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-brand-text">{stats.remainingQuota !== null ? stats.remainingQuota : "~"}</div>
                  <div className="text-xs text-brand-textMuted">Sisa</div>
                </div>
              </div>
            </Card>
          )}

          {/* Status & Kuota */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Users size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-brand-text">Status & Kuota</h3>
            </div>
            <Toggle checked={config.isActive} onChange={(checked) => setConfig({ ...config, isActive: checked })}
              label="Aktifkan Registrasi Publik" description="Buka halaman /register untuk pendaftaran publik" />
            <div>
              <Label className="mb-2">Kuota Peserta (0 = tanpa batas)</Label>
              <Input type="number" min={0} value={config.maxQuota}
                onChange={(e) => setConfig({ ...config, maxQuota: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="mb-2">Waktu Buka (opsional)</Label>
                <Input type="datetime-local" value={config.openAt || ""} onChange={(e) => setConfig({ ...config, openAt: e.target.value || null })} /></div>

- [ ] **Step 4: Add form content + field builder section**

```tsx
          {/* Form Content */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText size={20} className="text-brand-primary" />
              <h3 className="font-semibold text-brand-text">Konten Form</h3>
            </div>
            <div><Label className="mb-2">Judul</Label>
              <Input value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} /></div>
            <div><Label className="mb-2">Deskripsi</Label>
              <Textarea value={config.description || ""} onChange={(e) => setConfig({ ...config, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label className="mb-2">Pesan Sukses</Label><Input value={config.successMessage} onChange={(e) => setConfig({ ...config, successMessage: e.target.value })} /></div>
              <div><Label className="mb-2">Pesan Tutup</Label><Input value={config.closedMessage} onChange={(e) => setConfig({ ...config, closedMessage: e.target.value })} /></div>
              <div><Label className="mb-2">Pesan Penuh</Label><Input value={config.fullMessage} onChange={(e) => setConfig({ ...config, fullMessage: e.target.value })} /></div>
            </div>
          </Card>

          {/* Field Builder */}
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <ListPlus size={20} className="text-brand-primary" />
                <h3 className="font-semibold text-brand-text">Field Pendaftaran</h3>
              </div>
              <Button size="sm" variant="secondary" onClick={addField}><Plus size={16} /> Tambah Field</Button>
            </div>
            <p className="text-xs text-brand-textMuted">Susun field yang ditampilkan di form. Field 'Nama' wajib ada dan tidak bisa dihapus.</p>
            <div className="space-y-3">
              {config.fields.map((field, index) => (
                <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-brand-textMuted">#{index + 1}{field.key === "name" && " (wajib)"}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveField(index, "up")} disabled={index === 0} className="p-1.5 text-brand-textMuted hover:text-brand-text disabled:opacity-30"><ChevronUp size={16} /></button>
                      <button onClick={() => moveField(index, "down")} disabled={index === config.fields.length - 1} className="p-1.5 text-brand-textMuted hover:text-brand-text disabled:opacity-30"><ChevronDown size={16} /></button>
                      {field.key !== "name" && <button onClick={() => removeField(index)} className="p-1.5 text-brand-textMuted hover:text-brand-danger"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="mb-1 text-xs">Field</Label>
                      <Select value={field.key} disabled={field.key === "name"} onChange={(e) => updateField(index, { key: e.target.value })} className="w-full">
                        {FIELD_KEY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select></div>
                    <div><Label className="mb-1 text-xs">Label</Label>
                      <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} /></div>
                    <div><Label className="mb-1 text-xs">Tipe</Label>
                      <Select value={field.type} onChange={(e) => updateField(index, { type: e.target.value })} className="w-full">
                        <option value="text">Text (input)</option>
                        <option value="textarea">Textarea (multi-line)</option>
                      </Select></div>
                    <div><Label className="mb-1 text-xs">Placeholder</Label>
                      <Input value={field.placeholder || ""} onChange={(e) => updateField(index, { placeholder: e.target.value })} /></div>
                  </div>
                  <Toggle checked={field.required} onChange={(checked) => updateField(index, { required: checked })} label="Wajib diisi" disabled={field.key === "name"} />
                </div>
              ))}
            </div>
          </Card>
```

- [ ] **Step 5: Add other settings + save button + close the component**

```tsx
          {/* Other Settings */}
          <Card variant="elevated" className="space-y-4">
            <h3 className="font-semibold text-brand-text">Pengaturan Lainnya</h3>
            <Toggle checked={config.preventDuplicates} onChange={(checked) => setConfig({ ...config, preventDuplicates: checked })}
              label="Cegah Pendaftar Ganda" description="Tolak pendaftar dengan data yang sudah ada" />
            <div>
              <Label className="mb-2">Prefix ID Peserta Otomatis</Label>
              <Input value={config.guestIdPrefix} onChange={(e) => setConfig({ ...config, guestIdPrefix: e.target.value })} placeholder="PUB" className="font-mono" />
              <p className="text-xs text-brand-textMuted mt-1">Digunakan jika field 'ID Peserta' tidak ditampilkan. Contoh: PUB-42</p>
            </div>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} size="lg"><Save size={18} /> Simpan Pengaturan</Button>
          </div>
        </div>

## Phase 6: Frontend Integration & Navigation

### Task 6.1: Add PUBLIC to guest list SOURCE_CONFIG

**File (MODIFY):** `apps/frontend/app/(main)/admin/guests/page.tsx`

- [ ] **Step 1:** Find line 14 (the `RegistrationSource` type):
```typescript
type RegistrationSource = 'MANUAL' | 'IMPORT' | 'WALKIN';
```
Change to:
```typescript
type RegistrationSource = 'MANUAL' | 'IMPORT' | 'WALKIN' | 'PUBLIC';
```

- [ ] **Step 2:** Find `SOURCE_CONFIG` (around line 26). Add `PUBLIC` entry after `WALKIN`:
```typescript
const SOURCE_CONFIG: Record<RegistrationSource, { label: string; color: string; bg: string; border: string }> = {
  MANUAL: { label: 'Manual', color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
  IMPORT: { label: 'Import', color: 'text-brand-primarySoft', bg: 'bg-brand-primary/20', border: 'border-brand-primary/30' },
  WALKIN: { label: 'Walk-in', color: 'text-orange-300', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  PUBLIC: { label: 'Public', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
};
```

- [ ] **Step 3:** Find the badge display condition (around line 807):
```typescript
{src && g.registrationSource === 'WALKIN' && (
```
Change to show badge for both WALKIN and PUBLIC:
```typescript
{src && (g.registrationSource === 'WALKIN' || g.registrationSource === 'PUBLIC') && (
```

### Task 6.2: Add toggle + link card to event settings

**File (MODIFY):** `apps/frontend/app/(main)/admin/settings/event/page.tsx`

- [ ] **Step 1:** Add `enablePublicRegistration` to `EventConfig` interface (around line 54, after `enableTournament`):
```typescript
enableTournament: boolean;
enablePublicRegistration: boolean;
```

- [ ] **Step 2:** Add default value in the fallback config (around line 132):
```typescript
enableTournament: false,
enablePublicRegistration: false,
```

- [ ] **Step 3:** Add to the config mapping (around line 212):
```typescript
enableTournament: cfg.enableTournament ?? false,
enablePublicRegistration: cfg.enablePublicRegistration ?? false,
```

- [ ] **Step 4:** Add toggle UI. Find the `enableTournament` toggle in the JSX and add a similar toggle for public registration after it. Use the same toggle pattern used for other `enable*` fields. Add it in the same section where `enableLuckyDraw`, `enableSouvenir`, `enableTournament` toggles are.

- [ ] **Step 5:** Add `enablePublicRegistration` to the save payload. Find the `setActiveConfig` call (around line 200-215) and add:
```typescript
enablePublicRegistration: cfg.enablePublicRegistration ?? false,
```

- [ ] **Step 6:** Add a link card to the public registration settings page. Find the card links section (around line 370-420 where Users Management and Email Settings links are). Add after the Email Settings link:

```tsx
<Link
  href="/admin/settings/public-registration"
  className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors group"
>
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-emerald-500/20">
      <UserPlus size={20} className="text-emerald-400" />
    </div>
    <div>
      <div className="font-medium text-white">Registrasi Publik</div>
      <div className="text-xs text-white/60">Halaman pendaftaran publik & kuota</div>
    </div>
  </div>
  <ChevronRight size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
</Link>
```
Make sure `UserPlus` and `ChevronRight` are imported from `lucide-react` at the top of the file. If `UserPlus` is not already imported, add it to the existing lucide-react import.

### Task 6.3: Add /register link to TopNav

**File (MODIFY):** `apps/frontend/components/TopNav.tsx`

- [ ] **Step 1:** Find the public nav links in the `NavLinks` component (around line 72-130). The public links (Check-in, About) are rendered for all users. Add a `/register` link:

In the desktop nav (after the Check-in link, around line 95-100), add:
```tsx
<Link className={cls('/register')} href="/register">
  <UserPlus size={16} />
  <span>Daftar</span>
</Link>
```

In the mobile drawer (after the Check-in link, around line 311), add:
```tsx
<Link className={mobileLinkCls("/register")} href="/register">
  <UserPlus size={16} /> Daftar
</Link>
```

- [ ] **Step 2:** Import `UserPlus` from `lucide-react` if not already imported. Check the existing imports at the top of the file (lines 5-24). Add `UserPlus` to the import list.

**Note:** The `/register` link is always visible. If you want it conditional on `enablePublicRegistration`, you can check `eventCfg?.enablePublicRegistration` — but since the page itself handles the closed/inactive state gracefully, showing it always is acceptable.

---

### Task 6.4: Add enablePublicRegistration to events DTO + service (REQUIRED)

The event settings page sends `enablePublicRegistration` via `PUT /events/active` which uses `UpdateEventDto` and `setActiveConfig()`. These must accept the new field.

**File (MODIFY):** `apps/backend/src/events/dto/update-event.dto.ts`

- [ ] **Step 1:** Find the `enableTournament` field (around line 73-75). Add after it:
```typescript
  @IsOptional()
  @IsBoolean()
  enablePublicRegistration?: boolean;
```

**File (MODIFY):** `apps/backend/src/events/events.service.ts`

- [ ] **Step 2:** Find the `setActiveConfig` method input type (around line 206-225). Add `enablePublicRegistration?: boolean;` after `enableTournament?: boolean;`:
```typescript
  enableTournament?: boolean;
  enablePublicRegistration?: boolean;   // <-- add this
  allowDuplicateGuestId?: boolean;
```
The method already does `const data: any = { ...input };` so the field will be saved automatically.

- [ ] **Step 3:** Rebuild backend:
```bash
cd apps/backend && npm run build
```

---

## Phase 7: Verification & Testing

### Task 7.1: Build verification

- [ ] **Step 1: Build backend**
```bash
cd apps/backend && npm run build
```
Must pass with zero TypeScript errors. Common issues:
- Missing import for `PublicRegistrationModule` in `app.module.ts`
- Prisma client not regenerated (run `npx prisma generate`)

- [ ] **Step 2: Build frontend**
```bash
cd apps/frontend && npm run build
```
Must pass with zero errors. Common issues:
- Missing `UserPlus` import in `TopNav.tsx` or `event/page.tsx`
- Type mismatch: `RegistrationSource` type in `guests/page.tsx`

### Task 7.2: Database migration verification

- [ ] **Step 1:** Verify migration was created and applied:
```bash
cd apps/backend && npx prisma migrate status
```
Check the generated SQL file in `prisma/migrations/` — should contain:
- `ALTER TYPE "RegistrationSource" ADD VALUE 'PUBLIC'` (or equivalent)
- `ALTER TABLE "Event" ADD COLUMN "enablePublicRegistration" BOOLEAN NOT NULL DEFAULT false`
- `CREATE TABLE "PublicRegistrationConfig" (...)`

If enum addition fails (known Prisma issue with some PostgreSQL versions), create manual migration:
```bash
npx prisma migrate dev --create-only --name add_public_registration
```
Edit the SQL to use: `ALTER TYPE "RegistrationSource" ADD VALUE IF NOT EXISTS 'PUBLIC';`
Then apply: `npx prisma migrate dev`

### Task 7.3: Manual end-to-end test

- [ ] **Step 1: Start dev servers** (backend + frontend)

- [ ] **Step 2: Configure via admin**
1. Login to `/admin/login`
2. Settings > Event — enable `enablePublicRegistration` toggle, save
3. Settings > Registrasi Publik (`/admin/settings/public-registration`)
4. Toggle "Aktifkan Registrasi Publik" ON, set kuota 100
5. Add fields: Name (default), Email, Perusahaan via field builder
6. Save

### Task 7.4: Update documentation (optional)

- [ ] **Step 1:** Add entry to `CHANGELOG.md` following existing format:
```markdown
### Public Registration Page
- New `/register` public page for self-registration
- Configurable form fields (admin builds the form)
- Quota management with real-time progress
- Time window (open/close scheduling)
- Anti-duplicate option
- Integrates with existing Guest system (registrationSource: PUBLIC)
- Settings at /admin/settings/public-registration
```

- [ ] **Step 2:** Run `graphify update .` to update the knowledge graph (per CLAUDE.md instructions).

---

## Summary of All Files

### New Files (CREATE)
| # | File |
|---|------|
| 1 | `apps/backend/src/public-registration/public-registration.module.ts` |
| 2 | `apps/backend/src/public-registration/public-registration.controller.ts` |
| 3 | `apps/backend/src/public-registration/public-registration.service.ts` |
| 4 | `apps/backend/src/public-registration/dto/update-registration-config.dto.ts` |
| 5 | `apps/backend/src/public-registration/dto/submit-registration.dto.ts` |
| 6 | `apps/frontend/app/(main)/register/page.tsx` |
| 7 | `apps/frontend/app/(main)/admin/settings/public-registration/page.tsx` |

### Modified Files (MODIFY)
| # | File | Changes |
|---|------|---------|
| 1 | `apps/backend/prisma/schema.prisma` | Add PUBLIC enum, enablePublicRegistration, PublicRegistrationConfig model |
| 2 | `apps/backend/src/app.module.ts` | Import PublicRegistrationModule |
| 3 | `apps/backend/src/guests/guests.service.ts` | Add 'PUBLIC' to create() union type |
| 4 | `apps/backend/src/guests/guests.controller.ts` | Add PUBLIC to formatSource, formatSourcePdf, sourceColor |
| 5 | `apps/backend/src/events/dto/update-event.dto.ts` | Add enablePublicRegistration field |
| 6 | `apps/backend/src/events/events.service.ts` | Add enablePublicRegistration to setActiveConfig input |
| 7 | `apps/frontend/app/(main)/admin/guests/page.tsx` | Add PUBLIC to type + SOURCE_CONFIG + badge |
| 8 | `apps/frontend/app/(main)/admin/settings/event/page.tsx` | Add toggle + link card |
| 9 | `apps/frontend/components/TopNav.tsx` | Add /register link + UserPlus import |

### Migration (AUTO-GENERATED)
| # | File |
|---|------|
| 1 | `apps/backend/prisma/migrations/<timestamp>_add_public_registration/migration.sql` |

---

## Implementation Order (Recommended)

1. **Phase 1** — Database schema + migration (all backend depends on this)
2. **Phase 2** — Backend module (DTOs, service, controller, module)
3. **Phase 3** — Backend integration (app.module, guests.service, guests.controller) + build verify
4. **Phase 6 Task 6.4** — Events DTO + service + build verify
5. **Phase 4** — Frontend public registration page
6. **Phase 5** — Frontend admin settings page
7. **Phase 6 Tasks 6.1-6.3** — Frontend integration (guests page, event settings, TopNav) + build verify
8. **Phase 7** — Full verification + manual testing

- [ ] **Step 3: Test public registration**
1. Open `/register` in incognito (no login)
2. Verify form shows Nama, Email, Perusahaan fields
3. Verify quota bar shows "0 / 100"
4. Submit form — verify success screen with Guest ID (e.g. "PUB-1") + queue number
5. Submit again — verify "PUB-2"

- [ ] **Step 4: Verify guest list integration**
1. Admin > Guests (`/admin/guests`)
2. Verify registrants appear with "Public" badge (emerald)
3. Verify `checkedIn = false`, `registrationSource = PUBLIC`

- [ ] **Step 5: Test check-in**
1. Use `/checkin` kiosk — search by name or guest ID
2. Verify check-in works for public registrants

- [ ] **Step 6: Test edge cases**
1. Set kuota 1, register 2 — second gets "Kuota penuh"
2. Toggle OFF — `/register` shows closed message
3. Set `closeAt` to past — `/register` shows closed
4. Enable "Cegah Pendaftar Ganda", register same name twice — rejected


- [ ] **Step 1:** Find the public nav links in the `NavLinks` component (around line 72-130). The public links (Check-in, About) are rendered for all users. Add a `/register` link:

In the desktop nav (after the Check-in link, around line 95-100), add:
```tsx
<Link className={cls('/register')} href="/register">
  <UserPlus size={16} />
  <span>Daftar</span>
</Link>
```

In the mobile drawer (after the Check-in link, around line 311), add:
```tsx
<Link className={mobileLinkCls("/register")} href="/register">
  <UserPlus size={16} /> Daftar
</Link>
```

- [ ] **Step 2:** Import `UserPlus` from `lucide-react` if not already imported. Check the existing imports at the top of the file (lines 5-24). Add `UserPlus` to the import list.

**Note:** The `/register` link is always visible. If you want it conditional on `enablePublicRegistration`, you can check `eventCfg?.enablePublicRegistration` — but since the page itself handles the closed/inactive state gracefully, showing it always is acceptable.

---
      </div>
    </RequireAuth>
  );
}
```

---
              <div><Label className="mb-2">Waktu Tutup (opsional)</Label>
                <Input type="datetime-local" value={config.closeAt || ""} onChange={(e) => setConfig({ ...config, closeAt: e.target.value || null })} /></div>
            </div>
          </Card>
```
      </RequireAuth>
    );
  }
```
      setConfig({
        ...DEFAULT_CONFIG, ...cfgData,
        openAt: cfgData.openAt ? new Date(cfgData.openAt).toISOString().slice(0, 16) : null,
        closeAt: cfgData.closeAt ? new Date(cfgData.closeAt).toISOString().slice(0, 16) : null,
        fields: cfgData.fields || DEFAULT_CONFIG.fields,
      });
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
```
    </div>
  );
}
```

---
    );
  }
```
        body: JSON.stringify({ data: formData, website: honeypot }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseErrorMessage(text));
      const result = JSON.parse(text);
      setSuccessData({ message: result.message || "Registrasi berhasil!", guestId: result.guestId, queueNumber: result.queueNumber });
      setState("success");
    } catch (e: any) { setErrorMsg(e.message); }
    finally { setSubmitting(false); }
  };
```
const sourceColor = guest.registrationSource === 'WALKIN' ? '#f97316' : guest.registrationSource === 'IMPORT' ? '#3b82f6' : '#6b7280';
```
Change to:
```typescript
const sourceColor = guest.registrationSource === 'WALKIN' ? '#f97316' : guest.registrationSource === 'IMPORT' ? '#3b82f6' : guest.registrationSource === 'PUBLIC' ? '#10b981' : '#6b7280';
```

### Task 3.4: Build backend to verify

- [ ] **Step 1:** From `apps/backend` directory, run:
```bash
npm run build
```
Must pass with zero TypeScript errors. Fix any issues before proceeding.

---

Follows `LandingPageModule` pattern. Must import `EventsModule` AND `GuestsModule` (service depends on both).

```typescript
import { Module } from '@nestjs/common';
import { PublicRegistrationController } from './public-registration.controller';
import { PublicRegistrationService } from './public-registration.service';
import { EventsModule } from '../events/events.module';
import { GuestsModule } from '../guests/guests.module';

@Module({
  imports: [EventsModule, GuestsModule],
  controllers: [PublicRegistrationController],
  providers: [PublicRegistrationService],
})
export class PublicRegistrationModule {}
```

**IMPORTANT:** Check that `GuestsModule` exports `GuestsService`. Open `apps/backend/src/guests/guests.module.ts` and verify it has `exports: [GuestsService]`. If not, add it.

---

  // Admin: get registration stats
  async getStats() {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);
    const currentCount = await this.countPublicRegistrants(eventId);
    const { open } = this.isRegistrationOpen(config);
    return {
      isActive: config.isActive,
      isOpen: open,
      maxQuota: config.maxQuota,
      currentCount,
      remainingQuota: config.maxQuota > 0 ? Math.max(0, config.maxQuota - currentCount) : null,
      isFull: config.maxQuota > 0 && currentCount >= config.maxQuota,
    };
  }
}
```

---
      currentCount,
      remainingQuota: config.maxQuota > 0 ? Math.max(0, config.maxQuota - currentCount) : null,
      fields: (config.fields as any[]) || [],
      title: config.title,
      description: config.description,
      successMessage: config.successMessage,
      closedMessage: config.closedMessage,
      fullMessage: config.fullMessage,
    };
  }

  // Admin: get full config
  async getAdminConfig() {
    const eventId = await this.getActiveEventId();
    return this.getOrCreateConfig(eventId);
  }
```

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestIdPrefix?: string;
}
```

- [ ] **Step 2: Create `submit-registration.dto.ts`**

```typescript
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
}
```

---
  fields            Json      @default("[]")

  // Anti-duplicate
  preventDuplicates Boolean   @default(false)

  // Guest ID auto-generation prefix (used when guestId field not in form)
  guestIdPrefix     String    @default("PUB")

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

- [ ] **Step 4: Generate Prisma client + create migration**

Run from `apps/backend` directory:
```bash
npx prisma generate
npx prisma migrate dev --name add_public_registration
```

Verify migration SQL is additive (ALTER TABLE ADD COLUMN, CREATE TABLE, ALTER TYPE ADD VALUE). If `prisma migrate dev` fails due to enum addition, use this SQL approach instead:
```sql
ALTER TYPE "RegistrationSource" ADD VALUE 'PUBLIC';
```

---
| Kuota penuh (`count >= maxQuota`, maxQuota > 0) | Tampilkan `fullMessage`, reject submit |
| `maxQuota = 0` | Unlimited — tidak ada pengecekan kuota |
| Field `name` tidak ada di config | Service tetap wajibkan name (hardcoded) |
| Submit berisi field key tidak ada di config | Field diabaikan (hanya field di config yang diproses) |
| Field `guestId` tidak ditampilkan | Auto-generate: `${prefix}-${queueNumber}` |
| `preventDuplicates = true` | Cek kombinasi field required non-empty sudah ada di Guest |
| Honeypot field `website` terisi (bot) | Reject submit silently |
| Event tidak aktif | `getActiveEventId()` throw → halaman publik tampilkan error |

---
5. **SkipThrottle pattern** (`apps/backend/src/public/public.controller.ts` line 12): `@SkipThrottle({ default: true, short: true, medium: true, long: true })` at class level disables all rate limiting. **Use this on public registration controller** (NAT environment).

6. **GuestsService.create()** (`apps/backend/src/guests/guests.service.ts` line 256): Signature `create(input: CreateGuestDto, photoUrl?, skipDuplicateCheck?, registrationSource?: 'MANUAL' | 'IMPORT' | 'WALKIN')`. Auto-assigns queue number via `nextQueueNumber(eventId)`, defaults `tableLocation` to `'-'`, `category` to `'REGULAR'`. **Reuse this** — add `'PUBLIC'` to union type.

7. **Frontend API pattern** (`apps/frontend/lib/api.ts`): `apiBase()` for URL, `apiFetch<T>(path, options)` for authed fetch (auto-adds JWT), `parseErrorMessage(text)` for errors. For public (no-auth) endpoints use plain `fetch(\`${apiBase()}/...\`)`.

8. **Frontend admin settings pattern** (`apps/frontend/app/(main)/admin/settings/landing-page/page.tsx`): `RequireAuth` wrapper, `useState` for config, `useEffect` to fetch, `tokenHeader()` helper, collapsible sections, save via PUT. **Follow this structure.**

9. **UI components** (`apps/frontend/components/ui/`): `Card` (variant: solid|glass|elevated), `Input`, `Textarea`, `Label`, `Button` (variant, size, loading prop), `Toggle` (checked, onChange, label, description, icon), `Select`, `FormSection`.

10. **Styling**: Dark luxury theme. Tailwind brand tokens: `bg-brand-bg`, `bg-brand-bgElevated`, `text-brand-text`, `text-brand-textMuted`, `text-brand-primary` (gold), `border-brand-border`, `surface`, `surface-elevated`, `surface-glass`, `surface-interactive`. Lucide React for icons (no emoji).
│       │   │   │   └── guests/page.tsx           # MODIFY - add PUBLIC to SOURCE_CONFIG
│       │   │   └── layout.tsx                     # (main) layout with TopNav
│       │   └── page.tsx                  # landing page (Server Component)
│       ├── components/
│       │   ├── ui/                       # Card, Input, Label, Textarea, Button, Toggle, Select
│       │   ├── TopNav.tsx                # MODIFY - add /register link
│       │   └── RequireAuth.tsx           # Auth wrapper for admin pages
│       └── lib/api.ts                    # apiBase(), apiFetch(), parseErrorMessage()
```
