# Tournament & Competition Feature Design

**Date:** 2026-06-29  
**Status:** Draft  
**Author:** Yohanes Octavian Rizky

---

## Overview

Fitur modul tournament/kompetisi olahraga untuk Guest Registration & Check-in System. Mendukung berbagai format tournament (Single Elimination, Double Elimination, Round Robin, Swiss, Group Stage + Knockout) dengan bracket visualization, live match display, dan scoring system yang fleksibel.

### Goals

- Mendukung berbagai jenis kompetisi olahraga dan esports
- Real-time bracket update dan live score display untuk penonton di venue
- Fleksibel: bisa terikat event atau standalone
- Mendukung tim dan peserta individu (multi-level)
- Integrasi dengan fitur existing (Guest management, Event system, SSE infrastructure)

### Non-Goals (Phase 1)

- Auto-scheduling (Phase 4)
- Round Robin, Swiss, Group+Knockout formats (Phase 4)
- Match history & statistik lengkap (Phase 4)
- Export bracket as image (Phase 4)

---

## Architecture

### Pendekatan: Modul Terpisah

Tournament sebagai modul independen yang bisa optional di-enable per event, mengikuti pattern `enableLuckyDraw` dan `enableSouvenir` yang sudah ada.

```
┌─────────────────────────────────────────────────┐
│                   Event System                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Guest   │  │  Lucky   │  │  Souvenir    │   │
│  │  Mgmt    │  │  Draw    │  │  Mgmt        │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │           Tournament Module (BARU)            ││
│  │  ┌────────┐ ┌────────┐ ┌──────────────────┐  ││
│  │  │Bracket │ │ Match  │ │ Scoring & Live   │  ││
│  │  │Engine  │ │Manager │ │ Display          │  ││
│  │  └────────┘ └────────┘ └──────────────────┘  ││
│  └──────────────────────────────────────────────┘│
│           ▲ bisa standalone ATAU                 │
│           ▲ terikat ke Event (optional)          │
└─────────────────────────────────────────────────┘
```

### Integrasi

- **Event Model** mendapat field `enableTournament` (Boolean, default false)
- Tournament bisa dibuat **tanpa** event (standalone mode)
- Jika terikat event, peserta tournament bisa diambil dari daftar Guest yang sudah terdaftar
- Backend: NestJS module baru `tournaments/`
- Frontend: Route baru `/admin/tournaments`, `/tournament/bracket/[id]`, `/tournament/live/[matchId]`
- SSE: Channel baru `tournament_*` untuk update real-time bracket & skor
- File upload: Logo tim reuse upload infrastructure yang sudah ada

---

## Routing

| Route | Purpose |
|-------|---------|
| `/admin/tournaments` | List semua tournament |
| `/admin/tournaments/new` | Buat tournament baru |
| `/admin/tournaments/[id]` | Detail tournament, kelola tim & bracket |
| `/admin/tournaments/[id]/edit` | Edit tournament |
| `/admin/tournaments/[id]/matches` | Kelola jadwal & hasil pertandingan |
| `/admin/tournaments/[id]/matches/[matchId]` | Input skor & detail match |
| `/tournament/bracket/[id]` | **Public display** - bracket viewer (SSE) |
| `/tournament/live/[matchId]` | **Live match display** - skor live, logo vs logo |

---

## UI/UX Design

### Design System

**Design Read:** Tournament bracket viewer dan live match display untuk operator event dan penonton di venue. Bahasa visual: data-dense untuk admin, bold & high-contrast untuk public display.

**Dial Configuration:**
- `DESIGN_VARIANCE: 6` - Balanced, readable dari jarak jauh untuk public display
- `MOTION_INTENSITY: 5` - SSE updates smooth, tidak over-the-top
- `VISUAL_DENSITY: 7` - Bracket dan match list butuh data density

**Color Palette:**

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | `#FAFAFA` | `#0A0E1A` | Page background |
| `--surface` | `#FFFFFF` | `#13172A` | Cards, brackets |
| `--surface-elevated` | `#FFFFFF` | `#1C2138` | Modals, dropdowns |
| `--text-primary` | `#0F172A` | `#F8FAFC` | Headings, scores |
| `--text-secondary` | `#475569` | `#94A3B8` | Labels, metadata |
| `--accent` | `#0EA5E9` | `#38BDF8` | Winner highlight, active state |
| `--success` | `#22C55E` | `#4ADE80` | Winner badge, completed match |
| `--warning` | `#F59E0B` | `#FBBF24` | Live/ongoing indicator |
| `--destructive` | `#EF4444` | `#F87171` | Eliminated, error |
| `--border` | `#E2E8F0` | `#1E293B` | Dividers, bracket lines |

**Typography:**

| Level | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| Display | Inter | 800 | 48-64px | Live score numbers |
| Heading 1 | Inter | 700 | 32px | Tournament name, page title |
| Heading 2 | Inter | 600 | 24px | Team names on live match |
| Body | Inter | 400 | 16px | Match details, descriptions |
| Caption | Inter | 500 | 12px | Status badges, timestamps |
| Mono | JetBrains Mono | 500 | 14px | Timer, bracket round numbers |

**Icon System:** Lucide React (sudah ada di project), tidak ada emoji.

### Halaman-Halaman

#### A. Admin Tournament List (`/admin/tournaments`)

**Layout:**
- Header: "Tournaments" + tombol "+ New Tournament" (accent button)
- Filter bar: dropdown status (All / Ongoing / Completed / Draft), search box
- Table/list view dengan kolom:
  - Tournament name (link ke detail)
  - Format badge (Single Elim / Double Elim / dll)
  - Teams count (e.g., "16 teams")
  - Status pill (Draft / In Progress / Completed)
  - Created date
  - Actions (Edit, View Bracket, Delete)

**Empty state:** Ilustrasi SVG bracket kosong + "Create your first tournament"

**Mobile:** Stack jadi card list, status pill di kanan atas card.

#### B. Create/Edit Tournament (`/admin/tournaments/new` atau `/[id]/edit`)

**Form sections (progressive disclosure):**

1. **Basic Info**
   - Tournament name (required, max 100 char)
   - Sport type dropdown (Futsal, Basket, Voli, Badminton, Catur, Esports, Other)
   - Format dropdown (Single Elim, Double Elim, Round Robin, Swiss, Group + Knockout)
   - Participant type (Team / Individual) - radio button
   - Optional: Link to Event (dropdown, "None" jika standalone)

2. **Scoring Rules** (collapsible)
   - Scoring mode dropdown:
     - Simple (skor angka final)
     - Sets/Games (best of N, e.g., "Best of 3")
     - Points only (first to X points)
   - Conditional fields berdasarkan mode:
     - Sets: "Max sets" number input
     - Points: "Target points" number input
   - Tie-breaker rules (text area, opsional)

3. **Schedule** (collapsible)
   - Start date/time picker
   - End date/time picker (opsional)
   - Scheduling mode:
     - Manual (admin set jadwal per match)
     - Auto-generate (sistem generate dari bracket) - Phase 4
   - If auto: number of courts/fields input

4. **Teams / Participants**
   - Jika participant type = Team:
     - List tim terdaftar (card grid)
     - Tombol "+ Add Team" (buka modal: nama tim, upload logo, tambah anggota)
     - Tombol "Import from CSV"
   - Jika participant type = Individual:
     - List peserta (table)
     - Tombol "+ Add Participant" (buka modal: nama, foto opsional)
     - Tombol "Import from Guest List" (ambil dari database Guest event)
     - Tombol "Import from CSV"

**Form validation:** Inline error di bawah field, tidak di top summary.

**Submit:** Tombol "Create Tournament" (accent) + "Cancel" (ghost)

#### C. Tournament Detail (`/admin/tournaments/[id]`)

**Tab navigation:**
- Overview
- Bracket
- Matches
- Teams/Participants
- Settings

**Overview tab:**
- Stats cards row (grid 4-col desktop, 2-col tablet, 1-col mobile):
  - Total matches (e.g., "15 / 31")
  - Ongoing matches (e.g., "3")
  - Completed matches (e.g., "12")
  - Remaining (e.g., "16")
- Recent results (list 5 match terakhir selesai)
- Upcoming matches (list 5 match berikutnya)

**Bracket tab:**
- Full bracket visualization (lihat Section D)
- Tombol "Export as Image" (opsional, Phase 4)

**Matches tab:**
- Filter: All / Ongoing / Scheduled / Completed
- Table: Match ID, Round, Team A vs Team B, Score, Status, Scheduled time, Court, Actions
- Actions: Edit Score, Mark Live, Mark Complete

**Teams tab:**
- Grid card (3-col desktop, 2-col tablet, 1-col mobile)
- Card: Logo (atau initial), nama tim, jumlah anggota, stats (W-L-D)

**Settings tab:**
- Edit basic info, scoring rules, schedule (form sama seperti Create)

#### D. Bracket Visualization (reusable component)

**Layout:**
- Horizontal tree (kiri ke kanan: Round 1 → Round 2 → ... → Final)
- Setiap match box:
  ```
  ┌─────────────────┐
  │ Team A    [12]  │ ← winner: accent background
  │ Team B    [10]  │
  └─────────────────┘
  ```
- Connector lines (SVG atau CSS) antar match box
- Match status indicator:
  - Scheduled: border `--border`, text `--text-secondary`
  - Ongoing: border `--warning`, pulsing dot indicator
  - Completed: border `--success`, winner row accent background

**Interactions:**
- Hover match box: show tooltip dengan detail (scheduled time, court)
- Click match box: buka modal atau navigate ke match detail page
- Pan & zoom untuk bracket besar (gunakan CSS transform, bukan library)

**Mobile:** Stack vertikal, scrollable horizontal dengan snap points.

#### E. Live Match Display (`/tournament/live/[matchId]`)

**Hero section (full viewport, centered):**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [Team A Logo]           [Team B Logo]                │
│                                                         │
│     TEAM A        12  :  10        TEAM B              │
│                                                         │
│              [ SET 2 / BEST OF 3 ]                     │
│                                                         │
│              ⏱ 00:03:42 (jika ada timer)               │
│                                                         │
│              ● LIVE                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Background: solid dark (`#0A0E1A`) atau gradient subtle (opsional)
- Team logo: 128x128px desktop, 80x80px mobile (jika tidak ada logo, tampilkan initial dalam circle)
- Score: Display font, 96px desktop, 64px mobile, color `--text-primary`
- Separator `:` : color `--text-secondary`, same size as score
- Team name: Heading 2, uppercase, tracking wide
- Set indicator: Caption, color `--text-secondary`
- Timer: Mono font, color `--warning` (jika ongoing)
- Live badge: pulsing dot + "LIVE" text, color `--warning`

**Animations (subtle, MOTION_INTENSITY: 5):**
- Score change: brief flash (background `--accent` fade in/out, 300ms)
- Live badge: pulsing dot (opacity 0.5 ↔ 1, 2s loop)
- Timer tick: smooth, bukan jumpy

**Reduced motion:** Disable pulsing, instant score update.

**Auto-refresh:** SSE connection, update real-time.

**Footer (opsional, hide di TV mode):**
- Tournament name
- Round info (e.g., "Semi-Final")
- "Press F for fullscreen" hint (desktop only)

#### F. Public Bracket Viewer (`/tournament/bracket/[id]`)

**Layout:**
- Header: Tournament name + format badge
- Full-width bracket visualization (reuse component dari Section D)
- Pan & zoom enabled (mouse drag + scroll wheel)
- Auto-refresh via SSE (bracket update real-time)

**Mobile:**
- Vertical scroll, pinch-to-zoom
- Tap match box: show modal dengan detail match

**Empty state:** "Bracket will be generated once all teams are registered"

### Komponen Reusable

**BracketMatchBox**
- Props: `match: Match`, `onClick?: () => void`, `variant: 'admin' | 'public'`
- Admin variant: include action buttons (Edit Score, dll)
- Public variant: read-only, hover tooltip

**TeamLogo**
- Props: `src?: string`, `name: string`, `size: 'sm' | 'md' | 'lg'`
- Jika tidak ada `src`, render initial dalam circle dengan background accent

**ScoreDisplay**
- Props: `scoreA: number`, `scoreB: number`, `status: 'scheduled' | 'ongoing' | 'completed'`
- Winner score: color `--accent`
- Loser score: color `--text-secondary`

**LiveBadge**
- Pulsing dot + "LIVE" text
- Props: `active: boolean`

**MatchTimer**
- Props: `startTime: Date`, `isRunning: boolean`
- Format: `HH:MM:SS`
- Mono font, color `--warning` jika running

**StatusPill**
- Props: `status: 'scheduled' | 'ongoing' | 'completed' | 'eliminated'`
- Color mapping: scheduled = `--text-secondary`, ongoing = `--warning`, completed = `--success`, eliminated = `--destructive`

---

## Backend Architecture & Data Model

### Database Schema (Prisma)

```
┌──────────────────────────────────────────────────────────────┐
│                    TOURNAMENT DATA MODEL                      │
│                                                              │
│  Tournament ─────┬──── TournamentTeam ──── TeamMember       │
│       │          │                                           │
│       │          └──── Match ──── MatchSet                   │
│       │                │                                     │
│       │                └──── MatchParticipant                │
│       │                                                      │
│       └──── TournamentBracket ──── BracketRound              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Model: Tournament** (induk utama)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | String | Nama tournament (max 100) |
| `sportType` | enum | FUTSAL, BASKET, VOLLEY, BADMINTON, CHESS, ESPORTS, OTHER |
| `formatType` | enum | SINGLE_ELIM, DOUBLE_ELIM, ROUND_ROBIN, SWISS, GROUP_KNOCKOUT |
| `participantType` | enum | TEAM, INDIVIDUAL |
| `scoringMode` | enum | SIMPLE, SETS, POINTS |
| `scoringConfig` | Json? | `{ maxSets: 3 }` atau `{ targetPoints: 21 }` |
| `schedulingMode` | enum | MANUAL, AUTO |
| `courtCount` | Int | Jumlah lapangan (default 1) |
| `status` | enum | DRAFT, IN_PROGRESS, COMPLETED, CANCELLED |
| `startDate` | DateTime? | Kapan mulai |
| `endDate` | DateTime? | Kapan selesai |
| `eventId` | String? | FK ke Event (nullable = standalone) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Model: TournamentTeam** (tim atau individu yang terdaftar)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `tournamentId` | uuid | FK ke Tournament |
| `name` | String | Nama tim/individu |
| `logoUrl` | String? | Logo tim (nullable) |
| `seed` | Int? | Seed/urutan di bracket |
| `isEliminated` | Boolean | Sudah tersingkir? |
| `wins` | Int | Jumlah menang |
| `losses` | Int | Jumlah kalah |
| `draws` | Int | Jumlah seri |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Model: TeamMember** (anggota tim, multi-level)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `teamId` | uuid | FK ke TournamentTeam |
| `name` | String | Nama anggota |
| `photoUrl` | String? | Foto (nullable) |
| `jerseyNumber` | String? | Nomor punggung (opsional) |
| `guestId` | String? | FK ke Guest (jika terintegrasi event) |
| `role` | String? | e.g., "Captain", "Coach" |
| `createdAt` | DateTime | |

**Model: Match** (pertandingan)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `tournamentId` | uuid | FK ke Tournament |
| `roundId` | uuid? | FK ke BracketRound (nullable untuk group stage) |
| `matchNumber` | Int | Nomor urut match |
| `teamAId` | uuid? | FK ke TournamentTeam (nullable jika TBD) |
| `teamBId` | uuid? | FK ke TournamentTeam (nullable jika TBD) |
| `scoreA` | Int? | Skor tim A |
| `scoreB` | Int? | Skor tim B |
| `setsA` | Int? | Set won tim A (jika SETS mode) |
| `setsB` | Int? | Set won tim B (jika SETS mode) |
| `winnerId` | uuid? | FK ke TournamentTeam (siapa menang) |
| `status` | enum | SCHEDULED, ONGOING, COMPLETED, CANCELLED, WALKOVER |
| `scheduledAt` | DateTime? | Jadwal tanding |
| `startedAt` | DateTime? | Kapan mulai (actual) |
| `completedAt` | DateTime? | Kapan selesai |
| `court` | String? | Nama/lokasi lapangan |
| `nextMatchId` | uuid? | FK ke Match berikutnya (pemenang maju ke sini) |
| `nextMatchSlot` | String? | "A" atau "B" di match berikutnya |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Model: MatchSet** (detail per set/game, jika SETS mode)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `matchId` | uuid | FK ke Match |
| `setNumber` | Int | Set ke-berapa (1, 2, 3...) |
| `scoreA` | Int | Skor tim A di set ini |
| `scoreB` | Int | Skor tim B di set ini |
| `createdAt` | DateTime | |

**Model: MatchParticipant** (individu yang bertanding di match ini)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `matchId` | uuid | FK ke Match |
| `teamId` | uuid | FK ke TournamentTeam |
| `memberId` | uuid | FK ke TeamMember |
| `isStarter` | Boolean | Starter atau cadangan |

**Model: TournamentBracket** (container bracket per tournament)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `tournamentId` | uuid | FK ke Tournament (unique) |
| `type` | enum | WINNER, LOSER (untuk double elim) |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**Model: BracketRound** (babak dalam bracket)

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `bracketId` | uuid | FK ke TournamentBracket |
| `roundNumber` | Int | Babak ke-berapa (1 = pertama) |
| `name` | String? | e.g., "Round of 16", "Semi-Final", "Final" |
| `createdAt` | DateTime | |

**Event model** mendapat field baru:
- `enableTournament` Boolean @default(false)

### Backend Module Structure

```
apps/backend/src/tournaments/
├── tournaments.module.ts
├── tournaments.controller.ts      # REST API endpoints
├── tournaments.service.ts         # Business logic
├── bracket-engine.service.ts      # Generate & update bracket
├── match-scoring.service.ts       # Score input & winner logic
├── dto/
│   ├── create-tournament.dto.ts
│   ├── update-tournament.dto.ts
│   ├── create-team.dto.ts
│   ├── update-score.dto.ts
│   └── import-teams.dto.ts
└── types/
    └── tournament.types.ts
```

### API Endpoints

**Tournament CRUD:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments` | Buat tournament baru |
| GET | `/api/tournaments` | List semua tournament (filter: status, eventId) |
| GET | `/api/tournaments/:id` | Detail tournament + stats |
| PATCH | `/api/tournaments/:id` | Update tournament |
| DELETE | `/api/tournaments/:id` | Hapus tournament |
| POST | `/api/tournaments/:id/generate-bracket` | Generate bracket dari tim terdaftar |

**Teams:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tournaments/:id/teams` | Tambah tim |
| POST | `/api/tournaments/:id/teams/bulk` | Bulk add / import CSV |
| GET | `/api/tournaments/:id/teams` | List tim |
| PATCH | `/api/tournaments/:id/teams/:teamId` | Update tim |
| DELETE | `/api/tournaments/:id/teams/:teamId` | Hapus tim |
| POST | `/api/tournaments/:id/teams/:teamId/members` | Tambah anggota |
| DELETE | `/api/tournaments/:id/teams/:teamId/members/:memberId` | Hapus anggota |

**Matches:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tournaments/:id/matches` | List matches (filter: status, round) |
| GET | `/api/tournaments/:id/matches/:matchId` | Detail match + sets |
| PATCH | `/api/tournaments/:id/matches/:matchId/score` | Update skor |
| PATCH | `/api/tournaments/:id/matches/:matchId/status` | Change status (start/complete/cancel) |
| POST | `/api/tournaments/:id/matches/:matchId/sets` | Tambah/update set score |

**Public (no auth):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/tournaments/:id/bracket` | Get bracket data |
| GET | `/api/public/tournaments/:id/matches` | Get matches (read-only) |
| GET | `/api/public/matches/:matchId/live` | Get live match data |

### Bracket Engine Logic

**Input:** Array of teams (sudah di-seed atau random shuffle)  
**Output:** Array of Match objects dengan `nextMatchId` dan `nextMatchSlot` terhubung

**Single Elimination:**
```
16 teams → 8 matches R1 → 4 matches QF → 2 matches SF → 1 match F
Total matches = N - 1 = 15
```

**Double Elimination:**
```
Winner bracket: same as single elim
Loser bracket: losers drop, play each other
Grand Final: winner bracket champ vs loser bracket champ
Total matches ≈ 2N - 1 = 31
```

**Seeding:** Admin bisa set seed manual, atau pilih "Random Shuffle". Higher seed vs lower seed di round 1 (seed 1 vs seed 16, seed 2 vs seed 15, dst).

**Bye handling:** Jika jumlah tim bukan power of 2 (e.g., 10 teams), top seeds dapat bye otomatis ke round 2.

### SSE Events

Channel baru untuk real-time updates:

| Event Name | Payload | Trigger |
|------------|---------|---------|
| `tournament_match_score` | `{ matchId, scoreA, scoreB, setsA, setsB }` | Skor diupdate |
| `tournament_match_status` | `{ matchId, status, winnerId }` | Status match berubah |
| `tournament_bracket_update` | `{ tournamentId, roundId, matchId }` | Bracket berubah (pemenang maju) |
| `tournament_team_update` | `{ tournamentId, team }` | Tim ditambahkan/diupdate |

### Winner Advancement Logic

Ketika match di-mark COMPLETED:

1. Tentukan winner berdasarkan skor
2. Set `match.winnerId`
3. Jika match punya `nextMatchId`:
   - Set winner ke slot `nextMatchSlot` ("A" atau "B") di match berikutnya
   - Emit `tournament_bracket_update`
4. Mark loser sebagai `isEliminated = true` (single elim) atau pindahkan ke loser bracket (double elim)
5. Emit `tournament_match_status`

---

## Frontend Implementation & Real-time

### Route Structure

```
apps/frontend/app/
└── (main)/
    ├── admin/tournaments/
    │   ├── page.tsx                    # List tournaments
    │   ├── new/page.tsx                # Create tournament form
    │   └── [id]/
    │       ├── page.tsx                # Tournament detail (tabs)
    │       ├── edit/page.tsx           # Edit tournament
    │       └── matches/
    │           ├── page.tsx            # List matches
    │           └── [matchId]/page.tsx  # Score input & detail
    │
    └── tournament/                     # PUBLIC (no auth)
        ├── bracket/[id]/page.tsx       # Public bracket viewer
        └── live/[matchId]/page.tsx     # Live match display
```

### Key Components

```
apps/frontend/components/tournament/
├── bracket/
│   ├── BracketView.tsx              # Full bracket tree (SVG/CSS)
│   ├── BracketMatchBox.tsx          # Single match box
│   └── BracketConnector.tsx         # Lines between matches
├── match/
│   ├── LiveMatchDisplay.tsx         # Full-screen live score
│   ├── MatchCard.tsx                # Match summary card
│   ├── MatchTimer.tsx               # Live timer
│   └── ScoreInput.tsx               # Admin score input form
├── team/
│   ├── TeamCard.tsx                 # Team card with logo
│   ├── TeamLogo.tsx                 # Logo or initial fallback
│   └── TeamMemberList.tsx           # Members table
├── TournamentTabs.tsx               # Overview/Bracket/Matches/Teams/Settings
├── TournamentForm.tsx               # Create/edit form (shared)
└── StatusPill.tsx                   # Match/tournament status badge
```

### SSE Integration

Reuse SSE infrastructure yang sudah ada (`useSSE` hook di frontend).

```typescript
// hooks/useTournamentSSE.ts
function useTournamentSSE(tournamentId: string) {
  // Subscribe ke:
  // - tournament_match_score
  // - tournament_match_status
  // - tournament_bracket_update
  // - tournament_team_update
  
  // Auto-update React Query cache saat event diterima
  // Return: { isConnected, lastEvent }
}
```

**Live Match Display** khusus:
- Full-screen mode (tekan F atau tombol)
- Reconnect otomatis jika SSE putus
- Loading skeleton saat connect
- Error state jika match tidak ditemukan

### State Management

- **Server state:** React Query (cache tournament, matches, teams)
- **Real-time state:** SSE events auto-invalidate React Query cache
- **UI state (bracket pan/zoom):** `useState` lokal di BracketView
- **Form state:** React Hook Form + Zod validation

### Bracket Rendering Strategy

Bracket besar (32+ teams) bisa performance-heavy. Strategi:

1. **CSS Grid layout** (bukan SVG penuh) - lebih ringan
2. **Virtualize** match box yang di luar viewport (Phase 4 jika perlu)
3. **Pan/zoom:** CSS `transform: scale() translate()` dengan pointer events
4. **Mobile:** Horizontal scroll + pinch-to-zoom (CSS touch-action)

### Error Handling

| Scenario | Handling |
|----------|----------|
| SSE disconnect | Auto-reconnect dengan exponential backoff, show "Reconnecting..." banner |
| Score input conflict | Last-write-wins, show toast "Score updated by another operator" |
| Bracket generation fail | Show validation error (e.g., "Minimum 2 teams required") |
| Match not found (public) | Show 404 page dengan link ke tournament bracket |
| Logo upload fail | Fallback ke initial letter, toast "Logo upload failed" |

### Testing

**Backend:**
- Unit test: bracket-engine (generate bracket untuk 4, 8, 10, 16, 32 teams)
- Unit test: match-scoring (winner determination, tie-breaker, set scoring)
- Integration test: API endpoints (CRUD, score update, winner advancement)

**Frontend:**
- Component test: BracketMatchBox (semua status variants)
- Component test: ScoreInput (validation, edge cases)
- Manual test: Live match display dengan SSE updates

---

## Implementation Phases

### Phase 1: Core Tournament + Bracket (MVP)

**Cakupan:**
- CRUD tournament (format: Single Elimination only)
- Registrasi tim/individu (manual + import CSV)
- Generate bracket (single elimination)
- Bracket visualization (admin & public)
- Basic match management (list, status)

**Deliverables:**
- Backend: Tournament, TournamentTeam, TeamMember, Match, TournamentBracket, BracketRound models
- Backend: tournaments.controller.ts, tournaments.service.ts, bracket-engine.service.ts
- Frontend: /admin/tournaments/* pages, /tournament/bracket/[id] page
- Frontend: BracketView, BracketMatchBox, TeamCard components

**Estimated effort:** 3-4 days

### Phase 2: Match & Scoring

**Cakupan:**
- Input skor (simple, sets, points modes)
- Match status management (scheduled/ongoing/completed)
- Winner determination & advancement
- Live score display
- SSE integration untuk real-time updates

**Deliverables:**
- Backend: match-scoring.service.ts, MatchSet model
- Backend: SSE events (tournament_match_score, tournament_match_status, tournament_bracket_update)
- Frontend: /admin/tournaments/[id]/matches/* pages
- Frontend: /tournament/live/[matchId] page
- Frontend: LiveMatchDisplay, ScoreInput, MatchTimer components

**Estimated effort:** 2-3 days

### Phase 3: Public Display & Live Match

**Cakupan:**
- Public bracket viewer (read-only, SSE auto-refresh)
- Live match display (full-screen, optimized for TV/projector)
- Pan & zoom untuk bracket besar
- Fullscreen mode untuk live display

**Deliverables:**
- Frontend: /tournament/bracket/[id] public page
- Frontend: /tournament/live/[matchId] public page
- Frontend: Enhanced BracketView dengan pan/zoom
- Frontend: Fullscreen toggle untuk live display

**Estimated effort:** 1-2 days

### Phase 4: Advanced Features

**Cakupan:**
- Auto-scheduling (generate jadwal dari bracket + court count)
- Format tambahan: Double Elimination, Round Robin, Swiss, Group + Knockout
- Match history & statistik (W-L-D, top scorer, head-to-head)
- Bulk import teams (advanced CSV mapping)
- Export bracket as image

**Deliverables:**
- Backend: scheduling-engine.service.ts
- Backend: Enhanced bracket-engine (double elim, round robin, swiss)
- Frontend: Stats dashboard, advanced import wizard
- Frontend: Export bracket feature

**Estimated effort:** 5-7 days

---

## Success Criteria

### Functional Requirements Met

- [ ] Admin bisa buat tournament dengan berbagai format (Phase 1: Single Elim, Phase 4: lainnya)
- [ ] Admin bisa registrasi tim/individu (manual, CSV import, dari guest list)
- [ ] Sistem bisa generate bracket otomatis dari tim terdaftar
- [ ] Admin bisa input skor dan manage match status
- [ ] Pemenang otomatis maju ke match berikutnya di bracket
- [ ] Bracket bisa dilihat publik (read-only, real-time via SSE)
- [ ] Live match display bisa ditampilkan di TV/projector dengan skor live

### Non-Functional Requirements Met

- [ ] Bracket rendering smooth untuk 32+ teams (Phase 1-3)
- [ ] SSE updates latency < 500ms untuk score changes
- [ ] Live match display auto-reconnect jika SSE putus
- [ ] Responsive design: mobile (375px), tablet (768px), desktop (1024px+), TV (1920px+)
- [ ] Accessibility: WCAG AA compliance untuk semua halaman
- [ ] Dark mode support untuk public display pages

### Integration with Existing System

- [ ] Tournament bisa di-enable per event (field `enableTournament` di Event model)
- [ ] Peserta bisa di-import dari Guest list event
- [ ] Reuse SSE infrastructure yang sudah ada
- [ ] Reuse file upload infrastructure untuk logo tim
- [ ] Consistent design language dengan admin dashboard existing

---

## Technical Debt Prevention

### During Implementation

- Write tests untuk bracket-engine sebagai TDD (critical path)
- Use TypeScript strict mode untuk semua code baru
- Document API endpoints dengan JSDoc
- Use existing patterns dari Lucky Draw / Souvenir modules

### Code Review Checklist

- [ ] No hardcoded strings (use constants/i18n)
- [ ] Error handling untuk semua API calls
- [ ] Loading states untuk semua async operations
- [ ] Empty states untuk list views
- [ ] Mobile responsive tested (375px, 768px, 1024px)
- [ ] Dark mode tested untuk public pages
- [ ] Accessibility: focus states, aria-labels, keyboard navigation
- [ ] Performance: lazy load heavy components (BracketView untuk 32+ teams)

---

## References

- Existing SSE implementation: `apps/backend/src/public/public.service.ts`
- Existing file upload: `apps/backend/src/common/upload/`
- Lucky Draw module (pattern reference): `apps/backend/src/prizes/`
- Guest import (CSV import reference): `apps/backend/src/guests/guests.service.ts`

---

**End of Design Document**
