# Tournament Bugfix Implementation Plan

> **For agentic workers (Claude, etc.):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 bugs found in the Tournament feature — dropdown menu visibility, match management, bracket TBD on generate, calendar integration, and auth persistence across navigation.

**Architecture:** Tournament already exists as backend module (`apps/backend/src/tournaments/`) and frontend pages (`app/(main)/admin/tournaments/`, `app/(main)/tournament/bracket/`). All fixes target existing code — no new DB migrations needed.

**Tech Stack:** Next.js 15 (frontend), NestJS 10 (backend), PostgreSQL (database), Prisma (ORM), Server-Sent Events (real-time)

**Related Plan:** `docs/superpowers/plans/2026-07-07-tournament-core-integration.md`

## Bug Summary

| # | Bug | Root Cause | Severity |
|---|-----|-----------|----------|
| 1 | Tournament menu tidak muncul di dropdown | `enableTournament` conditional render benar, tapi default `false` + cache bisa stale setelah toggle | Medium |
| 2 | Tidak bisa manage matches (jadwal, assign team, court) | MatchScoringModal hanya punya Start/Score/Finish — tidak ada UI edit `scheduledAt`, assign team, set `court` | **Critical** |
| 3 | Bracket generate selalu TBD | BYE matches tidak auto-advance — tim lawan kosong harusnya otomatis menang dan advance ke round berikutnya | **Critical** |
| 4 | Tournament dates tidak muncul di Events Calendar | Calendar page hanya fetch events, tidak fetch tournaments | Medium |
| 5 | Login ulang setiap kembali dari domain utama | `RequireAuth` redirect sebelum client hydration selesai (SSR race condition) | Medium |

## Global Constraints

- No new DB migrations (all fields already exist in schema)
- Follow existing codebase patterns
- Reuse existing SSE infrastructure for real-time updates
- WCAG AA accessibility compliance
- Mobile-first responsive design

---

## Phase 1: Bracket BYE Auto-Advance (Bug #3 — Critical)

### Task 1.1: Add BYE auto-advance logic to BracketEngineService

**Files:**
- Modify: `apps/backend/src/tournaments/bracket-engine.service.ts`

**Goal:** After bracket generation, any first-round match where one team is real and the other is null (BYE) must auto-resolve: mark as WALKOVER, set winner, and advance winner to next round.

- [ ] **Step 1: Add Phase 3 — BYE auto-advance after nextMatchId wiring**

After `await Promise.all(updatePromises)` (line ~132), add:

```typescript
// ── Phase 3: Auto-advance BYE matches ──
// Any first-round match with only one team is a BYE.
// Auto-complete as WALKOVER and advance the real team.
for (const match of firstRoundCreated) {
  const hasTeamA = match.teamAId !== null;
  const hasTeamB = match.teamBId !== null;

  // Both teams exist or both missing → skip
  if ((hasTeamA && hasTeamB) || (!hasTeamA && !hasTeamB)) continue;

  const winnerId = hasTeamA ? match.teamAId! : match.teamBId!;

  // Mark match as WALKOVER
  await this.prisma.match.update({
    where: { id: match.id },
    data: {
      winnerId,
      status: MatchStatus.WALKOVER,
      completedAt: new Date(),
    },
  });

  // Advance winner to next match (re-fetch to get wired nextMatchId)
  const wired = await this.prisma.match.findUnique({
    where: { id: match.id },
    select: { nextMatchId: true, nextMatchSlot: true },
  });

  if (wired?.nextMatchId && wired?.nextMatchSlot) {
    const slotData =
      wired.nextMatchSlot === 'A'
        ? { teamAId: winnerId }
        : { teamBId: winnerId };
    await this.prisma.match.update({
      where: { id: wired.nextMatchId },
      data: slotData,
    });
  }
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd apps/backend && npm run build
```

- [ ] **Step 3: Manual test**

Create a tournament with 3 teams → generate bracket → verify:
- 1 match in round 1 has both teams
- 1 match in round 1 is WALKOVER with winner auto-set
- Semi-final match has the BYE winner advanced into one slot

- [ ] **Step 4: Test with power-of-2 teams**

Create tournament with 4 teams → generate bracket → verify all first-round matches have real team names (no TBD in round 1).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/tournaments/bracket-engine.service.ts
git commit -m "fix(bracket): auto-advance BYE matches on bracket generation

When team count is not a power of 2, first-round matches with only
one team (BYE) are now auto-resolved as WALKOVER. The real team is
advanced to the next round immediately."
```

---

## Phase 2: Match Management UI (Bug #2 — Critical)

### Task 2.1: Backend — Add match update endpoint

**Files:**
- Modify: `apps/backend/src/tournaments/tournaments.controller.ts`
- Modify: `apps/backend/src/tournaments/tournaments.service.ts`

**Goal:** Add `PUT /tournaments/matches/:matchId` endpoint to update match details: `scheduledAt`, `court`, `teamAId`, `teamBId`.

- [ ] **Step 1: Add `updateMatch()` method to TournamentsService**

```typescript
// apps/backend/src/tournaments/tournaments.service.ts

async updateMatch(
  matchId: string,
  data: {
    scheduledAt?: string | null;
    court?: string | null;
    teamAId?: string | null;
    teamBId?: string | null;
  },
) {
  const match = await this.prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new NotFoundException('Match not found');
  }

  const updateData: any = {};
  if (data.scheduledAt !== undefined) {
    updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
  }
  if (data.court !== undefined) {
    updateData.court = data.court;
  }
  if (data.teamAId !== undefined) {
    updateData.teamAId = data.teamAId || null;
  }
  if (data.teamBId !== undefined) {
    updateData.teamBId = data.teamBId || null;
  }

  const updated = await this.prisma.match.update({
    where: { id: matchId },
    data: updateData,
    include: {
      teamA: true,
      teamB: true,
      winner: true,
      round: true,
    },
  });

  // Emit SSE event
  const { emitEvent } = await import('../common/sse');
  emitEvent({
    type: 'match_updated',
    data: updated,
  });
  emitEvent({
    type: 'bracket_updated',
    data: { tournamentId: match.tournamentId },
  });

  return updated;
}
```

- [ ] **Step 2: Add controller route**

```typescript
// apps/backend/src/tournaments/tournaments.controller.ts

@Put('matches/:matchId')
updateMatch(
  @Param('matchId') matchId: string,
  @Body() body: { scheduledAt?: string; court?: string; teamAId?: string; teamBId?: string },
) {
  return this.tournaments.updateMatch(matchId, body);
}
```

**IMPORTANT:** This route must be placed BEFORE `@Get('matches/:matchId')` to avoid route conflict with NestJS. Place it right after the `// Match Endpoints` comment block header, before other match GET routes.

- [ ] **Step 3: Build + manual test**

```bash
cd apps/backend && npm run build
curl -X PUT http://localhost:4000/api/tournaments/matches/<matchId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"scheduledAt": "2026-07-10T14:00:00Z", "court": "Court A"}'
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/tournaments/tournaments.controller.ts apps/backend/src/tournaments/tournaments.service.ts
git commit -m "feat(tournament): add PUT endpoint for match details update

Supports updating scheduledAt, court, teamAId, teamBId on a match.
Emits SSE events for real-time bracket/match UI refresh."
```

---

### Task 2.2: Frontend API — Add match update method

**Files:**
- Modify: `apps/frontend/lib/tournament-api.ts`

- [ ] **Step 1: Add `matchApi.update()` method**

```typescript
// In matchApi object in tournament-api.ts

async update(
  matchId: string,
  data: { scheduledAt?: string | null; court?: string | null; teamAId?: string | null; teamBId?: string | null }
): Promise<Match> {
  return apiFetch<Match>(`${BASE}/matches/${matchId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
},
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/lib/tournament-api.ts
git commit -m "feat(tournament): add matchApi.update() for match details editing"
```

---

### Task 2.3: Frontend — Enhance MatchScoringModal with match editing

**Files:**
- Modify: `apps/frontend/components/tournament/match/MatchScoringModal.tsx`

**Goal:** Add editable fields for `scheduledAt`, `court`, and team assignment to the modal. Fields editable when match is SCHEDULED, read-only when ONGOING/COMPLETED.

- [ ] **Step 1: Add props for tournament teams list**

Update `MatchScoringModalProps` interface:

```typescript
interface MatchScoringModalProps {
  match: Match | null;
  scoringMode: ScoringMode;
  maxSets?: number;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  teams?: TournamentTeam[];  // <-- add: available teams for assignment
}
```

- [ ] **Step 2: Add state + handler for match details editing**

```typescript
const [scheduledAt, setScheduledAt] = useState('');
const [court, setCourt] = useState('');
const [savingDetails, setSavingDetails] = useState(false);

// Initialize state from match when modal opens
useEffect(() => {
  if (match) {
    setScheduledAt(match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : '');
    setCourt(match.court || '');
  }
}, [match]);

const handleSaveDetails = async () => {
  if (!match) return;
  setSavingDetails(true);
  setError(null);
  try {
    const { matchApi } = await import("@/lib/tournament-api");
    await matchApi.update(match.id, {
      scheduledAt: scheduledAt || null,
      court: court || null,
    });
    onUpdate();
  } catch (err: any) {
    setError(err.message || "Failed to save match details");
  } finally {
    setSavingDetails(false);
  }
};
```

- [ ] **Step 3: Add "Match Details" editing section in the modal body**

Insert before the action bar:

```tsx
{/* Match Details — editable when SCHEDULED */}
{match.status === MatchStatus.SCHEDULED && (
  <div className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4">
    <h4 className="text-sm font-semibold text-brand-text">Match Details</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-brand-textMuted mb-1">Jadwal Pertandingan</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>
      <div>
        <label className="block text-xs text-brand-textMuted mb-1">Court / Lapangan</label>
        <input
          type="text"
          value={court}
          onChange={(e) => setCourt(e.target.value)}
          placeholder="Contoh: Court A"
          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>
    </div>
    <Button size="sm" onClick={handleSaveDetails} loading={savingDetails}>
      Save Details
    </Button>
  </div>
)}
```

- [ ] **Step 4: Pass `teams` prop from parent tournament detail page**

In `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`, update the `<MatchScoringModal>` to pass teams:

```tsx
<MatchScoringModal
  match={selectedMatch}
  scoringMode={tournament.scoringMode || ScoringMode.SIMPLE}
  maxSets={tournament.scoringConfig?.maxSets || 3}
  open={matchModalOpen}
  onClose={() => { setMatchModalOpen(false); setSelectedMatch(null); }}
  onUpdate={refreshMatches}
  teams={teams}  // <-- add
/>
```

- [ ] **Step 5: Build + manual test**

```bash
cd apps/frontend && npm run build
```

Test flow:
1. Open tournament → Matches tab → click a SCHEDULED match
2. Modal shows → edit jadwal + court → Save Details → verify persisted
3. Start match → score input appears → update score → finish → verify bracket updates

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/components/tournament/match/MatchScoringModal.tsx apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
git commit -m "feat(tournament): add match details editing in MatchScoringModal

Admin can now edit scheduledAt and court for SCHEDULED matches.
Fields appear in the modal above the action buttons."
```

---

### Task 2.4: Auto-load matches on tournament detail page load

**Files:**
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`

**Goal:** Currently matches only load when user clicks "Matches" tab. Load matches on page load so overview stats (live/upcoming counts) are accurate.

- [ ] **Step 1: Move matches fetch into the main `fetchData` useEffect**

In the `useEffect` that fetches tournament data (around line 107-122), also fetch matches:

```typescript
useEffect(() => {
  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tournamentApi.getById(tournamentId);
      setTournament(data);
      setTeams(data.teams || []);
      // Also load matches immediately for overview stats
      const matchData = await matchApi.getByTournament(tournamentId);
      setMatches(matchData);
    } catch (err: any) {
      setError(err.message || "Failed to load tournament");
    } finally {
      setIsLoading(false);
    }
  }
  if (tournamentId) fetchData();
}, [tournamentId]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
git commit -m "fix(tournament): auto-load matches on page load for accurate overview stats"
```

---

## Phase 3: Calendar Integration (Bug #4)

### Task 3.1: Show tournament dates on Events Calendar

**Files:**
- Modify: `apps/frontend/app/(main)/admin/events/calendar/page.tsx`

**Goal:** Fetch tournaments alongside events and display tournament indicators on calendar days that have a tournament `startDate`.

- [ ] **Step 1: Add tournament state and fetch**

```typescript
// After the Event interface (around line 24), add Tournament interface
interface TournamentCalendarItem {
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  sportType?: string;
}

// In component state
const [tournaments, setTournaments] = useState<TournamentCalendarItem[]>([]);
```

- [ ] **Step 2: Fetch tournaments in fetchEvents or add parallel fetch**

```typescript
const fetchTournaments = async () => {
  try {
    const res = await fetch(`${apiBase()}/tournaments`, { headers: tokenHeader() });
    if (res.ok) {
      const data = await res.json();
      setTournaments(data);
    }
  } catch { /* silently fail — tournaments are optional decoration */ }
};

// Call alongside fetchEvents in useEffect
useEffect(() => {
  fetchEvents();
  fetchTournaments();
}, []);
```

- [ ] **Step 3: Update CalendarDay interface**

```typescript
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
  tournaments: TournamentCalendarItem[];  // <-- add
}
```

- [ ] **Step 4: Add getTournamentsForDate helper**

```typescript
const getTournamentsForDate = (date: Date): TournamentCalendarItem[] => {
  return tournaments.filter((t) => {
    if (!t.startDate) return false;
    const start = new Date(t.startDate);
    const end = t.endDate ? new Date(t.endDate) : start;
    // Check if date falls within tournament range (inclusive)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return dayStart >= startDay && dayStart <= endDay;
  });
};
```

- [ ] **Step 5: Include tournaments in getDaysInMonth**

Update all places where `CalendarDay` is constructed to include `tournaments: getTournamentsForDate(d)`.

- [ ] **Step 6: Render tournament indicator in calendar cell**

In the calendar day cell rendering (where events are shown), add tournament badges:

```tsx
{day.tournaments.length > 0 && day.tournaments.map((t) => (
  <Link
    key={t.id}
    href={`/admin/tournaments/${t.id}`}
    className="block text-xs px-1.5 py-0.5 rounded bg-brand-warning/10 text-brand-warning truncate hover:bg-brand-warning/20 transition-colors"
  >
    <span className="inline-flex items-center gap-1">
      <Trophy size={10} />
      {t.name}
    </span>
  </Link>
))}
```

- [ ] **Step 7: Build + manual test**

```bash
cd apps/frontend && npm run build
```

Create tournament with startDate → go to calendar → tournament indicator visible on that date.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/events/calendar/page.tsx
git commit -m "feat(calendar): show tournament dates on events calendar

Fetches tournaments and displays them as trophy-badged entries on
calendar days that fall within the tournament's start-end range."
```

---

## Phase 4: Tournament Menu Visibility (Bug #1)

### Task 4.1: Ensure cache invalidation on config update

**Files:**
- Modify: `apps/backend/src/events/events.service.ts`

**Goal:** Verify that `setActiveConfig()` calls `invalidateCache()` so that after toggling `enableTournament`, the `/config/event` endpoint returns fresh data.

- [ ] **Step 1: Verify `setActiveConfig()` invalidates cache**

Check if `setActiveConfig()` already calls `this.invalidateCache()`. If not, add it at the end of the method.

```typescript
// In setActiveConfig(), after the update:
await this.invalidateCache();
```

- [ ] **Step 2: Verify TopNav SSE listener refreshes on config change**

The TopNav already has an SSE listener for `config` events (line 59-63 of TopNav.tsx). Verify this updates `eventCfg` state which controls the tournament link visibility.

Current code already does:
```typescript
const onConfig = (e: MessageEvent) => {
  try {
    setEventCfg((prev: any) => ({ ...prev, ...JSON.parse(e.data) }));
  } catch {}
};
```

This should work. If `enableTournament` is included in the SSE event data (which it is, since the controller emits the full updated event), the menu should appear/disappear reactively.

- [ ] **Step 3: Manual test**

1. Go to Settings → enable Tournament toggle → Save
2. Without page reload, check Admin dropdown → Tournament should appear
3. Disable toggle → Save → Tournament should disappear from dropdown

- [ ] **Step 4: Commit (if changes needed)**

```bash
git add apps/backend/src/events/events.service.ts
git commit -m "fix(event): ensure cache invalidation after config update for reactive menu"
```

---

## Phase 5: Auth Persistence (Bug #5)

### Task 5.1: Fix RequireAuth hydration race condition

**Files:**
- Modify: `apps/frontend/components/RequireAuth.tsx`

**Goal:** Prevent `RequireAuth` from redirecting to login before client-side hydration completes. Current code runs `getToken()` in `useEffect` but renders children immediately — if Next.js does a full page load, there's a brief window where token check hasn't completed yet.

- [ ] **Step 1: Add loading state to RequireAuth**

```tsx
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken } from '../lib/api';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/admin/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // Don't render children until we've confirmed auth on client
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Fix TopNav auth state to re-check after navigation**

In `apps/frontend/components/TopNav.tsx`, update the auth check to also listen for `storage` events (cross-tab sync) and re-check on pathname change:

```typescript
// In the existing useEffect that checks auth (line 47-74):
// The current code already re-runs on pathname change:
useEffect(() => {
  if (typeof window === "undefined") return;
  setIsAuth(!!localStorage.getItem("token"));
  // ... rest of config fetch
}, [pathname, addEventListener, removeEventListener]);
```

This already re-checks auth on every path change. Add `storage` event listener for cross-tab logout detection:

```typescript
useEffect(() => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'token') {
      setIsAuth(!!e.newValue);
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, []);
```

- [ ] **Step 3: Build + manual test**

```bash
cd apps/frontend && npm run build
```

Test flow:
1. Login → navigate to `/` (landing page) → click back to `/admin/dashboard` → still logged in
2. Login → close tab → open new tab → go to `/admin/dashboard` → still logged in (within 24h)
3. Open DevTools → clear `token` from localStorage → page redirects to login

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/components/RequireAuth.tsx apps/frontend/components/TopNav.tsx
git commit -m "fix(auth): prevent hydration race condition in RequireAuth

- Add loading state so children don't render before auth check completes
- Add storage event listener in TopNav for cross-tab auth sync
- Prevents false redirect to login when navigating back to admin pages"
```

---

## Execution Order

```
Phase 1 (Bug #3) → Phase 2 (Bug #2) → Phase 3 (Bug #4) → Phase 4 (Bug #1) → Phase 5 (Bug #5)
```

Critical bugs first (bracket + match management), then integration features (calendar + menu), then UX polish (auth).

## Verification Plan

### Build Verification
```bash
cd apps/backend && npm run build     # Backend compiles
cd apps/frontend && npm run build    # Frontend compiles
```

### Manual Verification Checklist
- [ ] **Bug #3**: Generate bracket 3 teams → BYE auto-advance → no false TBD in round 1
- [ ] **Bug #3**: Generate bracket 4 teams → all first-round matches have real team names
- [ ] **Bug #2**: Click SCHEDULED match → edit jadwal + court → Save → data persists
- [ ] **Bug #2**: Overview tab shows correct live/upcoming counts on page load
- [ ] **Bug #4**: Create tournament with startDate → date appears on Events Calendar
- [ ] **Bug #1**: Enable tournament toggle → menu appears without page reload
- [ ] **Bug #5**: Login → navigate to `/` → back to `/admin/dashboard` → still logged in
