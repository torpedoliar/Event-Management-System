# Tournament Match Check-in Integration Implementation Plan

> **For agentic workers (Claude, etc.):** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Backend tasks MUST invoke `superpowers:test-driven-development` before writing services/controllers. Frontend component tasks MUST invoke `ui-ux-pro-max:ui-ux-pro-max` + `taste-skill:taste-skill` before writing any component CSS/layout.

**Goal:** Integrasikan check-in tournament ke core check-in tamu. Tamu yang merupakan anggota tim tournament dapat check-in per-match melalui kiosk tournament terpisah. Sistem memvalidasi jadwal pertandingan dan status eliminasi: tim yang sudah kalah (`isEliminated = true`) atau check-in di luar jadwal match ditolak dengan keterangan spesifik. Pemenang yang advance ke ronde berikutnya dapat check-in untuk match selanjutnya sesuai jadwal. Status check-in ditampilkan sebagai indikator hijau pada daftar member di Team Status. Check-in tournament tetap mempertahankan kapabilitas core check-in tamu (online + offline sync + IndexedDB) dan tercatat di sistem (`TournamentCheckin` + `GuestCheckin`).

**Architecture:** Tournament module sudah ada (`apps/backend/src/tournaments/`) dengan `match-scoring.service.ts` yang menangani eliminasi (`isEliminated = true`) dan advancement pemenang via `advanceWinner()` ke `nextMatchId`. Jembatan tamuâ†”tournament sudah ada via `TeamMember.guestId` (FK â†’ Guest). Core check-in tamu ada di `guests.service.ts â†’ checkIn()` dengan dukungan offline via `offline-sync.service.ts` + `indexeddb.ts`. Plan ini MENAMBAH model `TournamentCheckin` (link check-in per-match), service validasi `TournamentCheckinService`, kiosk terpisah `tournament-checkin/page.tsx`, dan indikator hijau di `TeamMemberList`. Mengikuti pattern existing: `enable*` toggle per-entity, SSE untuk real-time, reuse `GuestCheckin` untuk konsistensi core.

**Tech Stack:** Next.js 15 (frontend), NestJS 10 (backend), PostgreSQL (database), Prisma (ORM), Server-Sent Events (real-time), React Query (state), Lucide React (icons), Html5Qrcode (QR scan), IndexedDB (offline).

**Design Spec:** `docs/superpowers/specs/2026-06-29-tournament-feature-design.md`  
**Findings Report:** `docs/superpowers/tournament-integration-gaps-report.md`  
**Related Plans:** `docs/superpowers/plans/2026-07-07-tournament-core-integration.md`, `docs/superpowers/plans/2026-07-08-manual-match-management.md`

## Global Constraints

- Follow existing codebase patterns (Guests module for core check-in reuse, Lucky Draw/Souvenir for `enable*` toggles, `match-scoring.service.ts` for eliminasi/advancement)
- Use TypeScript strict mode for all new code
- WCAG AA accessibility compliance for all new UI
- Mobile-first responsive design (375px â†’ 1920px+)
- No emoji as icons (use Lucide React only)
- Reuse existing SSE infrastructure (`useSSE` / `useTournamentSSE` hooks, `common/sse.ts` `emitEvent`)
- Reuse existing offline infrastructure (`lib/indexeddb.ts`, `lib/offline-sync.service.ts`, `lib/connection-status.ts`)
- **Do NOT modify** `match-scoring.service.ts` eliminasi/advancement logic (verified correct) â€” only READ `isEliminated` and match `SCHEDULED` status
- New schema additions only (additive migration, non-destructive); all new fields have `@default`
- Check-in tournament MUST write to BOTH `TournamentCheckin` (per-match, for indicators & validation) AND `GuestCheckin` (core, for tamu statistics) â€” requirement: "harus tercatat di sistem"

## Skill Binding Guide

**MANDATORY:** Before starting each task, invoke the specified skills.

| Task Type | Required Skills | When to Invoke |
|-----------|----------------|----------------|
| **Backend Service / Endpoints / DTOs** | `superpowers:test-driven-development` | Before writing `TournamentCheckinService`, controllers, or DTOs |
| **Frontend Components / Kiosk / Forms** | `ui-ux-pro-max:ui-ux-pro-max` + `taste-skill:taste-skill` | Before writing ANY component CSS or layout code |
| **Database Schema** | `superpowers:test-driven-development` | Before/after migration to validate types compile |

## Verification Findings (Pre-Implementation Review)

Diverifikasi langsung dari source code pada 2026-07-09:

1. **Eliminasi logic** (`match-scoring.service.ts` lines 271, 337): loser â†’ `isEliminated: true`. âœ…
2. **Advancement logic** (`match-scoring.service.ts` lines 60-62, 309-320): winner â†’ `advanceWinner(nextMatchId, nextMatchSlot, winnerId)` sets `teamAId`/`teamBId` of next match (status stays `SCHEDULED`). âœ…
3. **Multi-round auto-work**: Pemenang round 1 otomatis ditempatkan di match SCHEDULED berikutnya â†’ cek `match SCHEDULED where teamAId/teamBId = winner` â†’ eligible untuk check-in. Tim kalah `isEliminated = true` â†’ ditolak. **Tidak perlu kode khusus multi-round.**
4. **Core check-in reuse** (`guests.service.ts` `checkIn()` line 363): membuat `GuestCheckin` + increment `Guest.checkinCount`. Tournament check-in akan memanggil ulang logika inti ini.
5. **Offline pattern** (`offline-sync.service.ts` + `indexeddb.ts`): pola `PendingCheckin` + `batchSync` sudah terbukti â€” di-reuse untuk tournament.
6. **Jembatan tamuâ†”tournament**: `TeamMember.guestId` (nullable FK â†’ Guest, line 501-502) sudah ada.

## Edge Cases Handled

| Edge Case | Penanganan |
|-----------|-----------|
| `Match.scheduledAt = null` (belum dijadwalkan) | Match tidak eligible â€” tidak bisa tentukan window jadwal |
| Tim belum punya match SCHEDULED | Tolak: "Tidak sesuai jadwal pertandingan" |
| Member scan ulang match sama | `@@unique([memberId, matchId])` â†’ balas "sudah check-in", bukan error (idempotent) |
| Member di multiple teams | Iterasi semua membership, validasi per-tim |
| `enableMatchCheckin = false` | Tidak ada tim yang di-consider â†’ tolak "Tournament check-in tidak aktif" |
| Offline duplicate sync | Unique constraint + `isDuplicate` flag (ikuti pattern existing) |

---

## Phase 1: Data Model (Backend)

### Task 1.1: Add `TournamentCheckin` model and `Tournament` check-in fields

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Goal:** Tambah model `TournamentCheckin` (check-in per member per match) dan field konfigurasi check-in di model `Tournament`. Additive migration, non-destructive.

- [ ] **Step 1: Add `TournamentCheckin` model**

```prisma
// apps/backend/prisma/schema.prisma (after model MatchParticipant or near tournament models)

model TournamentCheckin {
  id              String   @id @default(uuid())
  memberId        String
  member          TeamMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  matchId         String
  match           Match      @relation(fields: [matchId], references: [id], onDelete: Cascade)
  teamId          String
  tournamentId    String
  guestId         String?
  checkedAt       DateTime @default(now())
  checkedById     String?
  checkedByName   String?
  counterName     String?

  // Offline sync fields (mirrors GuestCheckin)
  isOffline       Boolean  @default(false)
  clientTimestamp DateTime?
  syncedAt        DateTime?
- [ ] **Step 2: Add relation to `TeamMember`**

```prisma
model TeamMember {
  // ... existing fields ...
  matchParticipations MatchParticipant[]
  tournamentCheckins   TournamentCheckin[]  // <-- add
}
```

- [ ] **Step 3: Add relation to `Match`**

```prisma
model Match {
  // ... existing fields ...
  participants    MatchParticipant[]
  checkins        TournamentCheckin[]  // <-- add
  previousMatches Match[]          @relation("NextMatch")
}
```

- [ ] **Step 4: Add check-in config fields to `Tournament`**

```prisma
model Tournament {
  // ... existing fields ...
  enableMatchCheckin   Boolean  @default(false)   // opt-in per tournament
  checkinWindowMinutes Int      @default(30)       // buka X menit SEBELUM scheduledAt
  checkinCloseMinutes  Int      @default(15)       // toleransi X menit SETELAH scheduledAt
  // ... existing relations ...
}
```

- [ ] **Step 5: Run Prisma migration**

```bash
cd apps/backend
npx prisma migrate dev --name add_tournament_match_checkin
npx prisma generate
```

Expected: Migration file created, Prisma client regenerated, zero data loss.

- [ ] **Step 6: Build verification**


## Phase 2: Backend Check-in Service (TDD)

### Task 2.1: DTOs for tournament check-in

**Files:**
- Create: `apps/backend/src/tournaments/dto/tournament-checkin.dto.ts`

**Goal:** DTO untuk request check-in tournament online & batch sync offline.

- [ ] **Step 1: Create DTOs**

```typescript
// apps/backend/src/tournaments/dto/tournament-checkin.dto.ts
import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class TournamentCheckinDto {
  @IsString()
  guestId!: string; // Guest.guestId (hasil scan QR / ID registrasi)

  @IsString()
  @IsOptional()
  adminId?: string;

  @IsString()
  @IsOptional()
  adminName?: string;

  @IsString()
  @IsOptional()
  counterName?: string;
}

export class OfflineTournamentCheckinDto {
  @IsString()
  guestId!: string;

  @IsString()
  @IsOptional()
  adminId?: string;

  @IsString()
  @IsOptional()
  adminName?: string;

  @IsString()
  @IsOptional()
  counterName?: string;

  @IsBoolean()
  isOffline!: boolean;

  @IsString()
  clientTimestamp!: string;
}

export class TournamentCheckinBatchSyncDto {
  @IsArray()

### Task 2.2: `TournamentCheckinService` (TDD â€” write tests first)

**Files:**
- Create: `apps/backend/src/tournaments/tournament-checkin.service.ts`
- Create: `apps/backend/test/tournaments/tournament-checkin.spec.ts`

**Goal:** Service validasi check-in per-match: cek eliminasi, cek jadwal window, tulis `TournamentCheckin` + `GuestCheckin` (reuse core), idempotent.

**Interfaces:**
- Consumes: Guest (by `guestId`), TeamMember (`guestId`), Match (`scheduledAt`, `status`, `teamAId`/`teamBId`), TournamentTeam (`isEliminated`), Tournament (`enableMatchCheckin`, `checkinWindowMinutes`, `checkinCloseMinutes`)
- Produces: `TournamentCheckin` record, `GuestCheckin` record (core), SSE `tournament_checkin`

- [ ] **Step 1: Write failing tests (TDD)**

```typescript
// apps/backend/test/tournaments/tournament-checkin.spec.ts
describe('TournamentCheckinService', () => {
  describe('checkInMember', () => {
    it('rejects when team is eliminated', /* ... */);
    it('rejects when no scheduled match within window', /* ... */);
    it('rejects when match.scheduledAt is null', /* ... */);
    it('allows check-in within window before scheduledAt', /* ... */);
    it('allows check-in within tolerance after scheduledAt', /* ... */);
    it('returns alreadyCheckedIn when re-scan same match (idempotent)', /* ... */);
    it('writes GuestCheckin (core) in same transaction', /* ... */);
    it('allows winner to check-in for next-round match (multi-round)', /* ... */);
    it('rejects when enableMatchCheckin is false', /* ... */);
  });

- [ ] **Step 2: Implement `TournamentCheckinService`**

```typescript
// apps/backend/src/tournaments/tournament-checkin.service.ts
@Injectable()
export class TournamentCheckinService {
  constructor(private prisma: PrismaService) {}

  async checkInMember(dto: TournamentCheckinDto) {
    // 1. Find Guest by guestId in active event
    // 2. Find TeamMembers where guestId = guest.id AND team.tournament.enableMatchCheckin = true AND tournament.status = IN_PROGRESS
    // 3. For each membership:
    //    - if team.isEliminated -> collect reject reason "Tim {name} sudah tereliminasi"
    //    - find eligible match: (teamAId=teamId OR teamBId=teamId) AND status=SCHEDULED AND scheduledAt NOT NULL
    //      AND scheduledAt within [now - window, now + close]
    //    - if none -> reject "Tidak sesuai jadwal pertandingan"
    //    - else -> candidate (pick nearest scheduledAt)
    // 4. If valid candidate:
    //    - upsert TournamentCheckin (unique memberId+matchId) -> if exists, return alreadyCheckedIn
    //    - create GuestCheckin + increment Guest.checkinCount (core reuse)
    //    - emit SSE tournament_checkin
    //    - return { success, member, team, match, alreadyCheckedIn, checkinId }
    // 5. If all rejected -> throw ConflictException with reasons[]
  }

  async getTeamCheckinStatus(tournamentId: string) {
    // returns Record<memberId, { checkedIn, matchId, matchLabel, checkedAt }>
  }

  async batchSyncOfflineCheckins(dto: TournamentCheckinBatchSyncDto) {
    // mirror offline-sync pattern: iterate, checkInMember, mark isDuplicate on conflict
  }

  async uncheckTournamentCheckin(checkinId: string) {
    // admin: remove TournamentCheckin record
  }
}
```

- [ ] **Step 3: Run tests until green**

```bash
cd apps/backend && npm test -- tournament-checkin

### Task 2.3: Controller endpoints

**Files:**
- Modify: `apps/backend/src/tournaments/tournaments.controller.ts`

**Goal:** Endpoint REST untuk check-in tournament, batch sync, status, uncheck.

**IMPORTANT:** Route ordering â€” place `@Post('checkin')` and `@Post('checkin/batch-sync')` BEFORE `@Get(':id')` to avoid param conflict.

- [ ] **Step 1: Add endpoints**

```typescript
// POST /tournaments/checkin          -> checkInMember (online kiosk)
// POST /tournaments/checkin/batch-sync -> batchSyncOfflineCheckins
// GET  /tournaments/:id/checkin-status -> getTeamCheckinStatus
// POST /tournaments/:id/checkin/uncheck -> uncheckTournamentCheckin
```

- [ ] **Step 2: Build + manual test (curl)**

```bash
cd apps/backend && npm run build
# curl POST /tournaments/checkin with valid guestId
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/tournaments/tournaments.controller.ts
git commit -m "feat(tournament): add REST endpoints for match check-in"
```

### Task 2.4: Module registration + SSE event type

**Files:**
- Modify: `apps/backend/src/tournaments/tournaments.module.ts`
- Modify: `apps/backend/src/tournaments/types/tournament.types.ts` (SSE type, if typed)
- Modify: `apps/frontend/types/tournament.types.ts` (SSE event type)

- [ ] **Step 1: Register `TournamentCheckinService` in module providers + controller**
- [ ] **Step 2: Add `tournament_checkin` to SSE event union types**
- [ ] **Step 3: Build both apps + commit**


## Phase 3: Tournament Settings DTO

### Task 3.1: Add check-in config to create/update DTOs

**Files:**
- Modify: `apps/backend/src/tournaments/dto/create-tournament.dto.ts`
- Modify: `apps/backend/src/tournaments/dto/update-tournament.dto.ts`
- Modify: `apps/backend/src/tournaments/tournaments.service.ts` (create/update include new fields)

- [ ] **Step 1: Add `@IsOptional() @IsBoolean() enableMatchCheckin?`, `@IsOptional() @IsInt() checkinWindowMinutes?`, `@IsOptional() @IsInt() checkinCloseMinutes?` to CreateTournamentDto**
- [ ] **Step 2: Ensure `create()`/`update()` in service pass these fields through**
- [ ] **Step 3: Build + commit**

```bash
cd apps/backend && npm run build
git add apps/backend/src/tournaments/dto/ apps/backend/src/tournaments/tournaments.service.ts
git commit -m "feat(tournament): add match check-in settings to tournament DTOs"
```

## Phase 4: Frontend Kiosk Tournament (Separate Page)

### Task 4.1: IndexedDB store for tournament pending check-ins

**Files:**
- Modify: `apps/frontend/lib/indexeddb.ts`

**Goal:** Tambah object store `tournamentPendingCheckins` (mirror `pendingCheckins` pattern).

- [ ] **Step 1: Add store + CRUD methods (`addTournamentPendingCheckin`, `getAllTournamentPendingCheckins`, `removeTournamentPendingCheckin`, `clearTournamentPendingCheckins`)**

### Task 4.2: Extend offline-sync service

**Files:**
- Modify: `apps/frontend/lib/offline-sync.service.ts`


### Task 4.3: Tournament check-in kiosk page (separate)

**Files:**
- Create: `apps/frontend/app/(main)/tournament-checkin/page.tsx`

**Goal:** Halaman kiosk terpisah, reuse pola dari `app/(main)/checkin/page.tsx` (QR scanner Html5Qrcode, search by guestId/name, station setup modal, connection-status indicator, popup hasil). Saat online â†’ `POST /tournaments/checkin`; offline â†’ antrikan ke IndexedDB, auto-sync.

**UI hasil spesifik (brand theme tokens, Lucide icons):**
- Success (brand-success): "Check-in berhasil â€” {match label} ({teamA} vs {teamB})"
- Reject (brand-danger): "Tim {name} sudah tereliminasi" / "Tidak sesuai jadwal pertandingan"
- Info (brand-textMuted): "Sudah check-in untuk match ini"

- [ ] **Step 1: Scaffold page reusing kiosk pattern**
- [ ] **Step 2: Wire QR scan + search to `POST /tournaments/checkin`**
- [ ] **Step 3: Offline queueing via IndexedDB**
- [ ] **Step 4: Result popup variants (success/reject/info)**

### Task 4.4: Entry points (conditional on enableMatchCheckin)

**Files:**
- Modify: `apps/frontend/app/(main)/admin/dashboard/page.tsx` (Quick Link)
- Modify: `apps/frontend/components/TopNav.tsx` (menu link, gated)

- [ ] **Step 1: Add "Tournament Check-in" Quick Link on dashboard (show only if active event has tournament with enableMatchCheckin)**
- [ ] **Step 2: Add nav link in TopNav (conditional)**
- [ ] **Step 3: Build frontend + commit**

```bash
cd apps/frontend && npm run build
git add -A
git commit -m "feat(tournament): add separate tournament check-in kiosk with offline support

## Phase 5: Indikator Hijau di Team Status

### Task 5.1: Frontend types

**Files:**
- Modify: `apps/frontend/types/tournament.types.ts`

- [ ] **Step 1: Add interfaces**

```typescript
export interface TournamentCheckin {
  id: string;
  memberId: string;
  matchId: string;
  teamId: string;
  tournamentId: string;
  guestId?: string;
  checkedAt: string;
  checkedById?: string;
  checkedByName?: string;
}

export interface CheckinResult {
  success: boolean;
  alreadyCheckedIn: boolean;
  member?: TeamMember;
  team?: TournamentTeam;
  match?: Match;
  checkinId?: string;
  reasons?: string[]; // rejection reasons
}

export interface TeamCheckinStatus {
  [memberId: string]: {
    checkedIn: boolean;
    matchId?: string;
    matchLabel?: string;
    checkedAt?: string;
  };
}

// Add to TournamentEvent union:
// | { type: 'tournament_checkin'; data: { tournamentId: string; memberId: string; matchId: string } }
```

- [ ] **Step 2: Add `enableMatchCheckin`, `checkinWindowMinutes`, `checkinCloseMinutes` to `Tournament` interface**

### Task 5.2: `checkinApi` in tournament-api

**Files:**

### Task 5.3: Check-in indicator in TeamMemberList + TeamCard

**Files:**
- Modify: `apps/frontend/components/tournament/team/TeamMemberList.tsx`
- Modify: `apps/frontend/components/tournament/team/TeamCard.tsx`

**Goal:** Render dot hijau + `CheckCircle` (Lucide, brand-success) di samping member yang sudah check-in sesuai match.

- [ ] **Step 1: Add `checkinStatus?: TeamCheckinStatus` prop to `TeamMemberList`**
- [ ] **Step 2: Render green indicator when `checkinStatus[member.id]?.checkedIn`**

```tsx
{checkinStatus?.[member.id]?.checkedIn && (
  <span className="flex items-center gap-1 text-brand-success" title={`Checked in: ${checkinStatus[member.id].matchLabel ?? ''}`}>
    <CheckCircle size={14} />
  </span>
)}
```

- [ ] **Step 3: Pass `checkinStatus` through `TeamCard` to `TeamMemberList`**

### Task 5.4: Tournament detail page wiring + SSE

**Files:**
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`
- Modify: `apps/frontend/hooks/useTournamentSSE.ts`

- [ ] **Step 1: Fetch `checkinApi.getStatus(tournamentId)` in tab Teams, store in state**
- [ ] **Step 2: Pass status to `TeamCard` instances**
- [ ] **Step 3: Add `onTournamentCheckin` handler in `useTournamentSSE` â†’ refetch status (live update indikator hijau)**
- [ ] **Step 4: Build + commit**

```bash
cd apps/frontend && npm run build
git add -A

## Phase 6: Settings UI

### Task 6.1: TournamentForm + edit page toggle

**Files:**
- Modify: `apps/frontend/components/tournament/TournamentForm.tsx`
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/edit/page.tsx`

- [ ] **Step 1: Add toggle `enableMatchCheckin` + number inputs `checkinWindowMinutes`/`checkinCloseMinutes` (only relevant when enabled)**
- [ ] **Step 2: Build + commit**

```bash
cd apps/frontend && npm run build
git add -A
git commit -m "feat(tournament): add match check-in settings UI (toggle + window config)"
```

---

## Phase 7: Testing & SDD Report

### Task 7.1: Unit tests (complete coverage)

**Files:**
- Modify/verify: `apps/backend/test/tournaments/tournament-checkin.spec.ts`

- [ ] **Step 1: Ensure all scenarios pass:**
  - valid window check-in (before & after scheduledAt)
  - eliminated team rejected
  - no scheduled match rejected
  - null scheduledAt rejected
  - idempotent re-scan
  - multi-round progression (winner round 1 â†’ check-in round 2)
  - enableMatchCheckin=false rejected
  - core GuestCheckin written in same transaction

### Task 7.2: Manual integration test

- [ ] **Create tournament (4 teams) â†’ generate bracket â†’ schedule matches (set `scheduledAt`)**
- [ ] **Enable `enableMatchCheckin` in settings**
- [ ] **Open `/tournament-checkin` kiosk â†’ scan member of Team A â†’ green success popup**
- [ ] **Verify indikator hijau muncul di tab Teams**
- [ ] **Finish match (Team A wins, Team B loses) â†’ Team B `isEliminated=true`**
- [ ] **Scan Team B member at kiosk â†’ "Tim {name} sudah tereliminasi"**
- [ ] **Scan Team B member out of schedule â†’ "Tidak sesuai jadwal pertandingan"**
- [ ] **Team A advances to round 2 (match SCHEDULED) â†’ scan Team A member â†’ berhasil (multi-round)**
- [ ] **Test offline: disconnect â†’ scan â†’ queued â†’ reconnect â†’ sync â†’ verify recorded in system**

### Task 7.3: SDD report + progress update

**Files:**
- Create: `.superpowers/sdd/task-3-brief.md` (per task briefs as implemented)
- Create: `.superpowers/sdd/task-3-report.md`
- Modify: `.superpowers/sdd/progress.md`

- [ ] **Step 1: Write report (status, commits, files changed, concerns)**
- [ ] **Step 2: Update progress.md with all task statuses**
- [ ] **Step 3: Final commit**

```bash
git add .superpowers/sdd/
git commit -m "docs(sdd): add tournament match check-in brief & report"
```

---

## File Change Summary

| File | Action | Phase |
|------|--------|-------|
| `apps/backend/prisma/schema.prisma` | Modify (add model + fields) | 1 |
| `apps/backend/src/tournaments/dto/tournament-checkin.dto.ts` | Create | 2 |
| `apps/backend/src/tournaments/tournament-checkin.service.ts` | Create | 2 |
| `apps/backend/test/tournaments/tournament-checkin.spec.ts` | Create | 2 |
| `apps/backend/src/tournaments/tournaments.controller.ts` | Modify (endpoints) | 2 |
| `apps/backend/src/tournaments/tournaments.module.ts` | Modify (register) | 2 |
| `apps/backend/src/tournaments/types/tournament.types.ts` | Modify (SSE type) | 2 |
| `apps/backend/src/tournaments/dto/create-tournament.dto.ts` | Modify | 3 |
| `apps/backend/src/tournaments/dto/update-tournament.dto.ts` | Modify | 3 |
| `apps/backend/src/tournaments/tournaments.service.ts` | Modify (create/update fields) | 3 |
| `apps/frontend/lib/indexeddb.ts` | Modify (store) | 4 |
| `apps/frontend/lib/offline-sync.service.ts` | Modify (sync) | 4 |
| `apps/frontend/app/(main)/tournament-checkin/page.tsx` | Create (kiosk) | 4 |
| `apps/frontend/app/(main)/admin/dashboard/page.tsx` | Modify (quick link) | 4 |
| `apps/frontend/components/TopNav.tsx` | Modify (nav link) | 4 |
| `apps/frontend/types/tournament.types.ts` | Modify (types) | 5 |
| `apps/frontend/lib/tournament-api.ts` | Modify (checkinApi) | 5 |
| `apps/frontend/components/tournament/team/TeamMemberList.tsx` | Modify (indicator) | 5 |
| `apps/frontend/components/tournament/team/TeamCard.tsx` | Modify (pass prop) | 5 |
| `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx` | Modify (status fetch) | 5 |
| `apps/frontend/hooks/useTournamentSSE.ts` | Modify (handler) | 5 |
| `apps/frontend/components/tournament/TournamentForm.tsx` | Modify (settings) | 6 |
| `apps/frontend/app/(main)/admin/tournaments/[id]/edit/page.tsx` | Modify (settings) | 6 |
| `.superpowers/sdd/task-3-*.md`, `progress.md` | Create/Modify | 7 |


## Recommendations / Best Practices

1. **Pisahkan tapi nyambung**: Kiosk tournament terpisah agar kiosk tamu biasa tidak terganggu, tetapi check-in tournament tetap menulis `GuestCheckin` + increment `checkinCount` → core check-in tamu konsisten & tercatat (sesuai requirement).
2. **Idempotent**: `@@unique([memberId, matchId])` — scan ulang = "sudah check-in", bukan error. Aman untuk offline sync duplikat.
3. **Definisi "sesuai jadwal"**: match `SCHEDULED` + `scheduledAt` dalam `[now − window, now + close]`. Default 30 menit sebelum, 15 menit setelah — dapat diatur per tournament.
4. **Multi-round otomatis**: karena `isEliminated` hanya true untuk yang kalah, pemenang yang advance via `nextMatchId` otomatis punya match `SCHEDULED` berikutnya → bisa check-in lagi tanpa kode khusus.
5. **Offline mengikuti pola existing**: reuse `indexeddb.ts` + `offline-sync.service.ts` + `connection-status.ts`.
6. **Real-time hijau**: SSE `tournament_checkin` → indikator update live tanpa refresh.
7. **Zero risk ke fitur existing**: tidak modifikasi `match-scoring.service.ts`; semua field baru `@default` → tidak break data.

## Assumptions

- QR scan menghasilkan `Guest.guestId` (ID registrasi) sama seperti kiosk tamu existing.
- "Tercatat di sistem" = persist ke DB (`TournamentCheckin` + `GuestCheckin`) + survive offline sync.
- `enableMatchCheckin` default `false` → tidak mengubah perilaku tournament existing sampai diaktifkan.