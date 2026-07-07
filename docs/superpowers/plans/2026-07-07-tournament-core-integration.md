# Tournament Core Integration Implementation Plan

> **For agentic workers (Claude, etc.):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the standalone Tournament feature into the core Event Management application — scope tournaments to the active event, enable importing team members from the guest list, add the `enableTournament` toggle, sync tournament dates with event dates, surface tournaments in the calendar/stats/dashboard, and reuse existing file upload infrastructure.

**Architecture:** Tournament already exists as a backend module (`apps/backend/src/tournaments/`) and frontend pages (`app/(main)/admin/tournaments/`, `app/(main)/tournament/bracket/`). This plan wires it into the existing Event → Guest → Settings core, following the same patterns already used by Guests, Lucky Draw, and Souvenir modules (e.g. `getActiveEventId()` auto-scoping, `enable*` toggles in Event Settings).

**Tech Stack:** Next.js 15 (frontend), NestJS 10 (backend), PostgreSQL (database), Prisma (ORM), Server-Sent Events (real-time), React Query (state management), Lucide React (icons)

**Design Spec:** `docs/superpowers/specs/2026-06-29-tournament-feature-design.md`  
**Findings Report:** `docs/superpowers/tournament-integration-gaps-report.md`

## Global Constraints

- Follow existing codebase patterns (Guests module for active-event scoping, Lucky Draw/Souvenir for `enable*` toggles)
- Use TypeScript strict mode for all new code
- WCAG AA accessibility compliance for all new UI
- Mobile-first responsive design (375px → 1920px+)
- No emoji as icons (use Lucide React only)
- Reuse existing SSE infrastructure (`useSSE` hook)
- Reuse existing file upload infrastructure (`logosStorage()`) for team logos
- Do NOT change existing DB schema unless a new migration is explicitly required (most fields already exist)

---

## Skill Binding Guide

**MANDATORY:** Before starting each task, invoke the specified skills.

| Task Type | Required Skills | When to Invoke |
|-----------|----------------|----------------|
| **Backend Logic / Endpoints** | `superpowers:test-driven-development` | Before writing backend services or controllers |
| **Frontend Components / Forms** | `ui-ux-pro-max:ui-ux-pro-max` + `taste-skill:taste-skill` | Before writing ANY component CSS or layout code |
| **API Endpoints / DTOs** | `superpowers:test-driven-development` | Before writing controllers or DTOs |
## Phase 1: Guest Picker for Team Member (Import Peserta dari Data Tamu)

### Task 1.1: Backend Endpoint — Eligible Guests for Tournament

**Files:**
- Modify: `apps/backend/src/tournaments/tournaments.service.ts`
- Modify: `apps/backend/src/tournaments/tournaments.controller.ts`

**Interfaces:**
- Consumes: Tournament model (has `eventId`), Guest model, TeamMember (has `guestId`)
- Produces: `GET /tournaments/:id/eligible-guests?q=...` endpoint

- [ ] **Step 1: Add `getEligibleGuests()` method to TournamentsService**

```typescript
// apps/backend/src/tournaments/tournaments.service.ts

/**
 * Fetch guests from the tournament's event that are NOT yet members
 * of any team in this tournament. Used by the guest picker UI.
 */
async getEligibleGuests(tournamentId: string, search?: string) {
  const tournament = await this.prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { eventId: true },
  });

  if (!tournament) {
    throw new NotFoundException('Tournament not found');
  }

  // Standalone tournament (no event) — no guests to pick from
  if (!tournament.eventId) {
    return [];
  }

  // Collect all guestIds already assigned to teams in this tournament
  const assignedMembers = await this.prisma.teamMember.findMany({
    where: { team: { tournamentId } },
    select: { guestId: true },
  });
  const assignedGuestIds = assignedMembers
    .map((m) => m.guestId)
    .filter((id): id is string => !!id);

  const where: any = { eventId: tournament.eventId };
  if (assignedGuestIds.length > 0) {
    where.id = { notIn: assignedGuestIds };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { guestId: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  return this.prisma.guest.findMany({
    where,
    select: {
      id: true, guestId: true, name: true, company: true,
      department: true, division: true, category: true, checkedIn: true,
    },
    orderBy: { name: 'asc' },
    take: 50, // limit for picker performance
  });
}
```

- [ ] **Step 2: Add controller route**

```typescript
// apps/backend/src/tournaments/tournaments.controller.ts

@Get(':id/eligible-guests')
getEligibleGuests(
  @Param('id') tournamentId: string,
  @Query('q') search?: string,
) {
  return this.tournaments.getEligibleGuests(tournamentId, search);
}
```

- [ ] **Step 3: Verify build compiles**

```bash
cd apps/backend
npm run build
```

- [ ] **Step 4: Manual test the endpoint**

```bash
curl http://localhost:4000/api/tournaments/<tournamentId>/eligible-guests?q= -H "Authorization: Bearer <token>"
```

Expected: Returns array of guests from the event not yet in any team. Standalone tournament returns `[]`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/tournaments/tournaments.service.ts apps/backend/src/tournaments/tournaments.controller.ts
git commit -m "feat(tournament): add eligible-guests endpoint for guest picker"
```

---

### Task 1.2: Frontend API Client — Eligible Guests

**Files:**
- Modify: `apps/frontend/lib/tournament-api.ts`
- Modify: `apps/frontend/types/tournament.types.ts` (add EligibleGuest type if not present)

- [ ] **Step 1: Add `EligibleGuest` type**

```typescript
// apps/frontend/types/tournament.types.ts

export interface EligibleGuest {
  id: string;
  guestId: string;
  name: string;
  company?: string | null;
### Task 1.3: Guest Picker Component

**SKILL BINDING:** Before writing this component, invoke:
1. `ui-ux-pro-max:ui-ux-pro-max` with args: "guest search picker combobox typeahead"
2. `taste-skill:taste-skill` with args: "searchable dropdown select guest"

**Files:**
- Create: `apps/frontend/components/tournament/team/GuestPicker.tsx`

**Interfaces:**
- Props: `tournamentId: string`, `value?: EligibleGuest | null`, `onChange: (guest: EligibleGuest | null) => void`, `disabled?: boolean`
- Consumes: `eligibleGuestApi.getEligible()`
- Produces: selected `EligibleGuest` object to parent

Apply design system: brand surface/border colors, search input with debounce (300ms), dropdown list with guest name + guestId + company, keyboard navigable (arrow keys + enter), clear selection button. Empty + loading states.

- [ ] **Step 1: Create GuestPicker component (state + logic)**

```tsx
// apps/frontend/components/tournament/team/GuestPicker.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, Loader2 } from "lucide-react";
import { eligibleGuestApi } from "@/lib/tournament-api";
import type { EligibleGuest } from "@/types/tournament.types";

interface GuestPickerProps {
  tournamentId: string;
  value?: EligibleGuest | null;
  onChange: (guest: EligibleGuest | null) => void;
  disabled?: boolean;
}

export function GuestPicker({ tournamentId, value, onChange, disabled }: GuestPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EligibleGuest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  const search = useCallback((q: string) => {
    setLoading(true);
    eligibleGuestApi.getEligible(tournamentId, q)
      .then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { if (open) search(query); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, search]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
- [ ] **Step 1b: Append render JSX to GuestPicker**

```tsx
  if (value) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-brand-bg border border-brand-border">
        <div className="flex items-center gap-2">
          <User size={16} className="text-brand-primary" />
          <div>
            <p className="text-sm font-medium text-brand-text">{value.name}</p>
            <p className="text-xs text-brand-textMuted">{value.guestId}{value.company ? ` Â· ${value.company}` : ""}</p>
          </div>
        </div>
        {!disabled && (
          <button type="button" onClick={() => onChange(null)} className="p-1 rounded-md text-brand-textMuted hover:text-brand-danger hover:bg-brand-danger/10" aria-label="Clear">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted pointer-events-none" />
        <input type="text" value={query} disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlightIdx(0); }}
          onFocus={() => { setOpen(true); search(""); }} onKeyDown={handleKey}
          placeholder="Cari tamu dari data event..."
          className="w-full pl-10 pr-4 py-2.5 bg-brand-bg border border-brand-border rounded-lg text-brand-text placeholder-brand-textMuted focus:outline-none focus:ring-2 focus:ring-brand-primary" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-textMuted" />}
      </div>
      {open && !loading && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 p-3 bg-brand-surface border border-brand-border rounded-lg shadow-lg text-sm text-brand-textMuted">
          {query ? "Tidak ada tamu ditemukan" : "Ketik untuk mencari tamu"}
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-brand-surface border border-brand-border rounded-lg shadow-lg">
          {results.map((g, i) => (
            <li key={g.id}>
              <button type="button" onMouseEnter={() => setHighlightIdx(i)} onClick={() => selectGuest(g)}
                className={`w-full text-left px-3 py-2.5 transition-colors ${i === highlightIdx ? "bg-brand-primary/10" : "hover:bg-white/[0.04]"}`}>
                <p className="text-sm font-medium text-brand-text">{g.name}</p>
                <p className="text-xs text-brand-textMuted">{g.guestId}{g.company ? ` Â· ${g.company}` : ""}{g.checkedIn ? " Â· Checked-in" : ""}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default GuestPicker;
```

- [ ] **Step 2: Verify it compiles** (`cd apps/frontend && npm run build`)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/components/tournament/team/GuestPicker.tsx
git commit -m "feat(tournament): add GuestPicker searchable component for team members"
```

---

### Task 1.4: Integrate GuestPicker into TeamMemberFormModal

**Files:**
- Modify: `apps/frontend/components/tournament/team/TeamMemberFormModal.tsx`

**Goal:** When a guest is selected via GuestPicker, auto-fill the member `name` from the guest and send `guestId` to the backend. Keep manual name entry as fallback (for non-guest members).

- [ ] **Step 1: Add GuestPicker import + state for selected guest**

```tsx
// In TeamMemberFormModal.tsx imports
import { GuestPicker } from "./GuestPicker";
import type { EligibleGuest } from "@/types/tournament.types";

// In component state
const [selectedGuest, setSelectedGuest] = useState<EligibleGuest | null>(null);
```

- [ ] **Step 2: Add GuestPicker above the Name field in the "Add Member" form**

```tsx
{/* Insert BEFORE the Name Label/Input */}
<div>
  <Label htmlFor="member-guest">Ambil dari Data Tamu (opsional)</Label>
  <GuestPicker
    tournamentId={/* pass tournamentId — see note */}
    value={selectedGuest}
    onChange={(g) => {
      setSelectedGuest(g);
      if (g) setName(g.name); // auto-fill name from guest
    }}
  />
</div>
```

**Note on `tournamentId`:** `TeamMemberFormModal` currently receives `teamId` and `teamName` but NOT `tournamentId`. Update the props interface to also accept `tournamentId` (the parent `admin/tournaments/[id]/page.tsx` has it available). Pass it down from the detail page.

- [ ] **Step 3: Update `teamApi.addMember()` call to include `guestId`**

```tsx
await teamApi.addMember(teamId, {
  name: name.trim(),
  jerseyNumber: jerseyNumber.trim() || undefined,
  role: role.trim() || undefined,
  guestId: selectedGuest?.id, // <-- send the Guest.id (FK)
});
```

- [ ] **Step 4: Clear `selectedGuest` on successful add**

```tsx
// after onSuccess() in handleSubmit success branch
setSelectedGuest(null);
```

- [ ] **Step 5: Update parent `admin/tournaments/[id]/page.tsx` to pass `tournamentId`**

```tsx
## Phase 2: Tournament Scoped ke Event Aktif

### Task 2.1: Backend — Active Event Scoping in TournamentsService

**Files:**
- Modify: `apps/backend/src/tournaments/tournaments.module.ts` (import EventsModule)
- Modify: `apps/backend/src/tournaments/tournaments.service.ts`

**Goal:** Mirror the pattern from `GuestsService.getActiveEventId()`. When `findAll(eventId?)` is called without an explicit `eventId`, auto-resolve the active event. Same for `create()` defaulting `eventId` to the active event when not provided.

- [ ] **Step 1: Import EventsModule into TournamentsModule**

```typescript
// apps/backend/src/tournaments/tournaments.module.ts
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],  // <-- add EventsModule
  providers: [BracketEngineService, MatchScoringService, TournamentsService],
  ...
})
```

**Note:** Verify `EventsModule` exports `EventsService`. If not, add it to exports in `events.module.ts`.

- [ ] **Step 2: Inject EventsService + add `getActiveEventId()` helper**

```typescript
// apps/backend/src/tournaments/tournaments.service.ts
import { EventsService } from '../events/events.service';

@Injectable()
export class TournamentsService {
  constructor(
    private prisma: PrismaService,
    private bracketEngine: BracketEngineService,
    private events: EventsService,  // <-- add
  ) {}

  private async getActiveEventId(): Promise<string | null> {
    const active = await this.events.getActive();
    return active ? active.id : null;
  }
  ...
```

- [ ] **Step 3: Update `findAll()` to auto-scope by active event**

```typescript
async findAll(eventId?: string) {
  // If no eventId provided, fall back to the active event
  if (!eventId) {
    const activeId = await this.getActiveEventId();
    if (activeId) eventId = activeId;
  }
  return this.prisma.tournament.findMany({
    where: eventId ? { eventId } : undefined,
    include: { teams: { include: { members: true } }, _count: { select: { matches: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 4: Update `create()` to default `eventId` to active event when not provided**

```typescript
async create(createTournamentDto: CreateTournamentDto) {
  let eventId = createTournamentDto.eventId;
  if (!eventId) {
    // Default to the active event so tournaments are scoped to it
    eventId = (await this.getActiveEventId()) ?? undefined;
  }
  return this.prisma.tournament.create({
    data: {
      ...existingFields,
      eventId: eventId || null,  // null if no active event (standalone)
    },
    include: { ... },
  });
}
```

- [ ] **Step 5: Build + manual test**

```bash
cd apps/backend && npm run build
# Create a tournament without eventId → verify it's linked to active event
# GET /tournaments (no eventId) → only returns active event's tournaments
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/tournaments/tournaments.module.ts apps/backend/src/tournaments/tournaments.service.ts
git commit -m "feat(tournament): auto-scope tournaments to active event

- findAll() falls back to active event when no eventId
- create() defaults eventId to active event
- Mirrors GuestsService.getActiveEventId() pattern"
### Task 2.2: Frontend — Pass activeEventId to tournament lists

**Files:**
- Modify: `apps/frontend/app/(main)/admin/tournaments/page.tsx`
- Modify: `apps/frontend/app/(main)/tournament/bracket/page.tsx`

**Goal:** The backend now auto-scopes, so the frontend `getAll()` calls (without eventId) will already be filtered. Verify this works. Optionally show a banner when no active event is set.

- [ ] **Step 1: Verify `tournamentApi.getAll()` (no arg) returns only active event's tournaments**

Manual test in the admin tournaments list page after Task 2.1.

- [ ] **Step 2 (optional): Add empty-state message when no active event**

```tsx
// In admin/tournaments/page.tsx, if tournaments.length === 0 and no active event config:
<p className="text-brand-textMuted">Belum ada tournament. Pastikan ada event aktif.</p>
```

- [ ] **Step 3: Commit (if changes made)**

```bash
git add apps/frontend/app/\(main\)/admin/tournaments/page.tsx apps/frontend/app/\(main\)/tournament/bracket/page.tsx
git commit -m "chore(tournament): verify active-event scoping in frontend lists"
```

---


## Phase 3: Toggle `enableTournament` di Event Settings

### Task 3.1: Backend — Handle `enableTournament` in setActiveConfig

**Files:**
- Modify: `apps/backend/src/events/events.service.ts`
- Modify: `apps/backend/src/events/dto/update-event.dto.ts` (if it restricts fields)

**Goal:** Add `enableTournament?: boolean` to the `setActiveConfig()` input so the settings page can persist the toggle. The DB field already exists in schema.

- [ ] **Step 1: Add `enableTournament` to the `setActiveConfig` input type**

```typescript
// apps/backend/src/events/events.service.ts — setActiveConfig input
async setActiveConfig(input: {
  // ... existing fields ...
  enableTournament?: boolean;  // <-- add
}) {
  // existing create/update logic already spreads `...input` into data,
  // so this field will be persisted automatically. Verify the data spread includes it.
}
```

- [ ] **Step 2: Verify `UpdateEventDto` allows `enableTournament`** (add `@IsOptional() @IsBoolean()` if the DTO whitelists fields explicitly)

- [ ] **Step 3: Build + manual test** (`PUT /events/active` with `{ enableTournament: true }` → verify it persists)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/events/events.service.ts apps/backend/src/events/dto/update-event.dto.ts
git commit -m "feat(event): persist enableTournament in setActiveConfig"
```

---

### Task 3.2: Frontend — Add Tournament Toggle in Event Settings

**SKILL BINDING:** invoke `ui-ux-pro-max` + `taste-skill` with args: "toggle switch settings form event"

**Files:**
- Modify: `apps/frontend/app/(main)/admin/settings/event/page.tsx`

- [ ] **Step 1: Add `enableTournament` to `EventConfig` interface**

```tsx
interface EventConfig {
  // ... existing ...
  enableTournament: boolean;  // <-- add
}
```

- [ ] **Step 2: Add a toggle UI next to `enableLuckyDraw`/`enableSouvenir`**

Copy the exact toggle markup used for `enableLuckyDraw`/`enableSouvenir` (the switch + label pattern). Use `Trophy` icon from lucide-react.

- [ ] **Step 3: Include `enableTournament` in the save payload**

Find where the settings form assembles the PUT body and add `enableTournament: cfg.enableTournament`.

- [ ] **Step 4: Build + manual test** (toggle on/off → save → reload → value persists)

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/settings/event/page.tsx
git commit -m "feat(tournament): add enableTournament toggle in Event Settings"
```

---
### Task 3.3: Gating — Hide Tournament menu/bracket when disabled

**Files:**
- Modify: `apps/frontend/components/TopNav.tsx`
- Modify: `apps/frontend/app/(main)/tournament/bracket/page.tsx`

- [ ] **Step 1: In TopNav, only show the Tournament admin link when `eventCfg?.enableTournament`**

```tsx
// Filter adminLinks to include tournament only when enabled
const visibleAdminLinks = adminLinks.filter(
  (l) => l.href !== "/admin/tournaments" || eventCfg?.enableTournament
);
// Use visibleAdminLinks in both desktop + mobile menus
```

- [ ] **Step 2: In public bracket page, if `enableTournament` is false, show a disabled message**

```tsx
// fetch /config/event -> if !enableTournament show "Tournament tidak diaktifkan untuk event ini"
```

- [ ] **Step 3: Build + manual test** (disable tournament in settings -> menu link disappears -> bracket page shows disabled state)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/components/TopNav.tsx apps/frontend/app/\(main\)/tournament/bracket/page.tsx
git commit -m "feat(tournament): gate Tournament menu + bracket by enableTournament"
```

---


## Phase 4: Integrasi Lanjutan (Calendar, Stats, Sync Tanggal)

### Task 4.1: Backend — Include Tournament count in Event Stats

**Files:**
- Modify: `apps/backend/src/events/events.service.ts` (`getStats()`)

- [ ] **Step 1: Add `tournaments` count to the `Promise.all` in `getStats()`**

```typescript
async getStats(id: string) {
  const event = await this.prisma.event.findUnique({ where: { id } });
  if (!event) throw new NotFoundException('Event not found');

  const [totalGuests, checkedIn, souvenirs, prizes, tournaments] = await Promise.all([
    this.prisma.guest.count({ where: { eventId: id } }),
    this.prisma.guest.count({ where: { eventId: id, checkedIn: true } }),
    this.prisma.souvenir.count({ where: { eventId: id } }),
    this.prisma.prize.count({ where: { eventId: id } }),
    this.prisma.tournament.count({ where: { eventId: id } }),  // <-- add
  ]);

  return { totalGuests, checkedIn, souvenirs, prizes, tournaments };  // <-- add
}
```

- [ ] **Step 2: Build + manual test** (`GET /events/:id/stats` → includes `tournaments`)

- [ ] **Step 3: Commit**


```bash
git add apps/backend/src/events/events.service.ts
git commit -m "feat(event): include tournament count in event stats"
```

---

### Task 4.2: Frontend — Display Tournament count in Event card

**Files:**
- Modify: `apps/frontend/app/(main)/admin/events/page.tsx`

- [ ] **Step 1: Add `tournaments` to the `EventStats` interface**

```tsx
interface EventStats {
  totalGuests: number;
  checkedIn: number;
  souvenirs: number;
  prizes: number;
  tournaments: number;  // <-- add
}
```

- [ ] **Step 2: Add a Tournament stat chip next to the others (uses `Trophy` icon)**

```tsx
<span className="flex items-center gap-1.5 text-brand-warning">
  <Trophy size={14} />
  {event.stats.tournaments} tournament
</span>
```

- [ ] **Step 3: Build + manual test** (event card shows tournament count)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/events/page.tsx
git commit -m "feat(event): show tournament count on event cards"
```

---

### Task 4.3: Tournament in Event Calendar

**SKILL BINDING:** invoke `ui-ux-pro-max` + `taste-skill` with args: "calendar event marker tournament badge"

**Files:**
- Modify: `apps/frontend/app/(main)/admin/events/calendar/page.tsx`

**Goal:** Show a small tournament indicator on calendar days that have a tournament `startDate`.

- [ ] **Step 1: Fetch tournaments for the active/specified event in the calendar page**

```tsx
// After fetching events, also fetch tournaments (reuse tournamentApi.getAll())
// Build a map: dateKey (YYYY-MM-DD) -> tournament[]
```

- [ ] **Step 2: Render a small Trophy badge on calendar days that have tournaments**

```tsx
{day.tournaments.length > 0 && (
  <div className="mt-1 flex items-center gap-1 text-xs text-brand-warning">
    <Trophy size={10} /> {day.tournaments.length} tournament
  </div>
)}
```

- [ ] **Step 3: Build + manual test** (create a tournament with startDate -> appears on calendar)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/events/calendar/page.tsx
git commit -m "feat(event): show tournament badges on event calendar"
```

---

### Task 4.4: Sync Tournament Dates with Event Date

**Files:**
- Modify: `apps/frontend/components/tournament/TournamentForm.tsx`

**Goal:** When creating a tournament scoped to an event, auto-suggest the event's `date`/`time` as default `startDate`, and validate that tournament dates fall within the event's date (or warn).

- [ ] **Step 1: Fetch the active event config in `TournamentForm` (via `GET /config/event`)**

```tsx
useEffect(() => {
  fetch(`${apiBase()}/config/event`).then(r => r.json()).then((e) => setEventConfig(e));
## Phase 5: Enhancement (Dashboard, Upload Logo, Live Match)

### Task 5.1: Tournament Quick Link on Dashboard

**Files:**
- Modify: `apps/frontend/app/(main)/admin/dashboard/page.tsx`

- [ ] **Step 1: Add a QuickLink to `/admin/tournaments` with `Trophy` icon (only when `enableTournament`)**

```tsx
{eventCfg?.enableTournament && (
  <QuickLink href="/admin/tournaments" icon={<Trophy size={24} />}>Tournament</QuickLink>
)}
```

- [ ] **Step 2: Build + manual test**

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/dashboard/page.tsx
git commit -m "feat(dashboard): add Tournament quick link"
```

---

### Task 5.2: Upload Logo Tim via File (reuse infrastructure)

**Files:**
- Modify: `apps/backend/src/tournaments/tournaments.controller.ts` (add upload endpoint)
- Modify: `apps/frontend/components/tournament/team/TeamFormModal.tsx`
- Modify: `apps/frontend/lib/tournament-api.ts`

**Goal:** Replace the manual `logoUrl` text input with a file upload, reusing the backend `logosStorage()` pattern used for event logos.

- [ ] **Step 1: Add backend upload endpoint**

```typescript
// tournaments.controller.ts
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('logo', { storage: logosStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
@Post('teams/:teamId/upload-logo')
async uploadTeamLogo(@Param('teamId') teamId: string, @UploadedFile() file: Express.Multer.File) {
  if (!file) throw new BadRequestException('No logo file provided');
  const url = `/api/uploads/tournament-logos/${file.filename}`;
  await this.tournaments.updateTeam(teamId, { logoUrl: url } as any);
  return { logoUrl: url };
}
```

**Note:** Verify `logosStorage()` can be pointed at a `tournament-logos` directory, or create a dedicated storage in `common/storage.ts`.

- [ ] **Step 2: Frontend — add `teamApi.uploadLogo(teamId, file)` method**

### Task 5.3: Live Match Display Route `/tournament/live/[matchId]`

**Files:**
- Create: `apps/frontend/app/(main)/tournament/live/[matchId]/page.tsx`

**Goal:** Create a full-screen live match display page reusing the already-built `LiveMatchDisplay.tsx` + `MatchTimer.tsx` components, optimized for TV/projector.

- [ ] **Step 1: Create the live match page**

```tsx
// app/(main)/tournament/live/[matchId]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { matchApi } from "@/lib/tournament-api";
import { LiveMatchDisplay } from "@/components/tournament/match/LiveMatchDisplay";
import type { Match } from "@/types/tournament.types";

export default function LiveMatchPage() {
  const params = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  useEffect(() => {
    if (params.matchId) matchApi.getById(params.matchId as string).then(setMatch).catch(console.error);
  }, [params.matchId]);
  if (!match) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  return <LiveMatchDisplay match={match} />;
}
```

- [ ] **Step 2: Add a "Live Display" link from the admin match card** (opens `/tournament/live/[matchId]` in new tab)

- [ ] **Step 3: Build + manual test** (start a match -> open live display -> score updates via SSE)

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/\(main\)/tournament/live/
git commit -m "feat(tournament): add live match display route for TV/projector"
```

---

## Summary

### Complete Implementation Plan — Tournament Core Integration

### Tasks Checklist

**Phase 1 — Guest Picker (Prioritas Tinggi)**
- [ ] Task 1.1: Backend `eligible-guests` endpoint
- [ ] Task 1.2: Frontend `eligibleGuestApi` client
- [ ] Task 1.3: `GuestPicker` component
- [ ] Task 1.4: Integrate GuestPicker into `TeamMemberFormModal`

**Phase 2 — Scope Event Aktif (Prioritas Tinggi)**
- [ ] Task 2.1: Backend active-event scoping in `TournamentsService`
- [ ] Task 2.2: Frontend list verification

**Phase 3 — enableTournament Toggle (Prioritas Tinggi)**
- [ ] Task 3.1: Backend handle `enableTournament` in `setActiveConfig`
- [ ] Task 3.2: Frontend toggle in Event Settings
- [ ] Task 3.3: Gating menu + bracket by `enableTournament`

**Phase 4 — Integrasi Lanjutan (Prioritas Sedang)**
- [ ] Task 4.1: Backend tournament count in event stats
- [ ] Task 4.2: Frontend tournament count on event cards
- [ ] Task 4.3: Tournament badges in event calendar
- [ ] Task 4.4: Sync tournament dates with event date

**Phase 5 — Enhancement (Prioritas Rendah)**
- [ ] Task 5.1: Tournament quick link on dashboard
- [ ] Task 5.2: Upload team logo via file
- [ ] Task 5.3: Live match display route

### Phase -> Findings Mapping

| Phase | Resolves Finding |
|-------|------------------|
| Phase 1 | Spec #2 (Import peserta dari Guest List) + GAP F (eligible-guests endpoint) |
| Phase 2 | Spec #3 (Tournament terikat event) |
| Phase 3 | Spec #1 (enableTournament flag) + GAP E (gating public bracket) |
| Phase 4 | GAP A (calendar), GAP B (stats), GAP D (sync tanggal) |
| Phase 5 | Spec #4 (upload logo), Spec #5 (live match), GAP C (dashboard) |

### Execution Approach

**Recommended:** Subagent-driven development — dispatch a fresh subagent per task, review between tasks.

**Suggested order:** Phase 1 -> Phase 2 -> Phase 3 (the three high-priority items), then Phase 4, then Phase 5. Each task is independently committable.

### Post-Implementation

- [ ] Update `version.json` changelog with new integration features
- [ ] Update `docs/superpowers/tournament-integration-gaps-report.md` -> mark resolved items
- [ ] Run `graphify update .` to refresh the knowledge graph

---

**End of Implementation Plan**
