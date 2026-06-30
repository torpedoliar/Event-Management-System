# Tournament Frontend Theme Fix + Landing Page Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tournament admin/public frontend fully reachable, visually consistent with the existing dark-gold brand theme, fix runtime bugs, and tighten landing page section spacing so it feels dynamic rather than disconnected.

**Architecture:** Reuse the existing branded UI primitives (`Button`, `Card`, `Input`, `Select`, `Badge`, `Modal`, `StatusBadge`, `FormSection`) and Tailwind `brand-*` tokens already used by the rest of the app. Replace generic `gray/blue/green/purple/red/slate` utility classes in tournament components. Keep page structure and data flow unchanged.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, Lucide React, existing UI primitives in `apps/frontend/components/ui/`, existing API client `apps/frontend/lib/tournament-api.ts`.

## Global Constraints

- All tournament UI must use the existing brand theme (`bg-brand-bg`, `bg-brand-surface`, `border-brand-border`, `text-brand-text`, `text-brand-textMuted`, `text-brand-primary`, `text-brand-success`, `text-brand-warning`, `text-brand-danger`, `focus:ring-brand-primary/50`).
- Reuse existing UI primitives where possible; do not reinvent buttons, inputs, selects, cards, modals, or badges.
- Do not add new dependencies.
- Preserve all existing behavior and data contracts unless explicitly changed in a task.
- Each task ends with `npm run build` (backend or frontend as relevant) passing and a commit.
- `rtk` prefix for all shell commands per global CLAUDE.md.

---

## File Structure

### Modified tournament files
- `apps/frontend/components/TopNav.tsx` — add `/admin/tournaments` link.
- `apps/frontend/components/tournament/StatusPill.tsx` — theme with `ui/Badge`.
- `apps/frontend/components/tournament/TournamentTabs.tsx` — theme, fix prop sync.
- `apps/frontend/components/tournament/TournamentForm.tsx` — theme with primitives, add scoringConfig editor.
- `apps/frontend/components/tournament/match/MatchCard.tsx` — theme, fix `hasScores` undefined bug.
- `apps/frontend/components/tournament/match/LiveMatchDisplay.tsx` — theme, fix `hasScores` bug.
- `apps/frontend/components/tournament/match/LiveMatchCard.tsx` — theme, replace `<img>` with Next.js `<Image>`.
- `apps/frontend/components/tournament/match/MatchTimer.tsx` — theme, remove dead `isDarkMode` code.
- `apps/frontend/components/tournament/match/ScoreInput.tsx` — theme with primitives.
- `apps/frontend/components/tournament/bracket/BracketView.tsx` — theme, fix connector direction logic.
- `apps/frontend/components/tournament/bracket/BracketMatchBox.tsx` — theme, remove unused imports.
- `apps/frontend/components/tournament/bracket/BracketConnector.tsx` — theme, fix SVG clipping.
- `apps/frontend/components/tournament/team/TeamCard.tsx` — theme with `ui/Card`.
- `apps/frontend/components/tournament/team/TeamMemberList.tsx` — theme.
- `apps/frontend/components/tournament/team/TeamLogo.tsx` — theme fallback colors.
- `apps/frontend/app/(main)/admin/tournaments/page.tsx` — theme with primitives.
- `apps/frontend/app/(main)/admin/tournaments/new/page.tsx` — theme.
- `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx` — theme, fix type casts, implement team/match quick links.
- `apps/frontend/app/(main)/admin/tournaments/[id]/edit/page.tsx` — theme.
- `apps/frontend/app/(main)/tournament/bracket/[id]/page.tsx` — theme, fix public SSE.

### Modified landing page files
- `apps/frontend/components/landing/Hero.tsx` — make vertical padding configurable.
- `apps/frontend/components/landing/Features.tsx` — reduce and parameterize spacing.
- `apps/frontend/components/landing/Gallery.tsx` — reduce and parameterize spacing.
- `apps/frontend/app/page.tsx` — pass compact spacing when sections are adjacent.

---

## Task 1: Expose Tournament Admin Navigation

**Files:**
- Modify: `apps/frontend/components/TopNav.tsx:89-104`

**Interfaces:**
- Consumes: existing `adminLinks` array and Lucide icons.
- Produces: visible link to `/admin/tournaments` in desktop Admin dropdown and mobile drawer.

- [ ] **Step 1: Add Trophy import**

Add `Trophy` to the existing Lucide import line at the top of `TopNav.tsx`:

```tsx
import {
  UserCheck,
  LayoutDashboard,
  Users,
  Dices,
  LogOut,
  LogIn,
  Info,
  Menu,
  X,
  Package,
  BarChart3,
  CalendarDays,
  Activity,
  Layout,
  Settings,
  ChevronDown,
  Trophy,
} from "lucide-react";
```

- [ ] **Step 2: Add tournament link to adminLinks**

Insert into the `adminLinks` array (after Dashboard or before Settings):

```tsx
const adminLinks: AdminLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/statistics", label: "Statistik", icon: <BarChart3 size={16} /> },
  { href: "/admin/guests", label: "Tamu", icon: <Users size={16} /> },
  { href: "/luckydraw", label: "Lucky Draw", icon: <Dices size={16} /> },
  { href: "/souvenir", label: "Doorprize", icon: <Package size={16} /> },
  { href: "/admin/tournaments", label: "Tournament", icon: <Trophy size={16} /> },
  { href: "/admin/events", label: "Events", icon: <CalendarDays size={16} /> },
  { href: "/admin/settings/event", label: "Settings", icon: <Settings size={16} /> },
  { href: "/admin/settings/landing-page", label: "Landing", icon: <Layout size={16} /> },
  { href: "/admin/system", label: "System", icon: <Activity size={16} /> },
];
```

- [ ] **Step 3: Verify link renders**

Run dev server, open `/admin/dashboard`, confirm "Tournament" appears in the Admin dropdown and navigates to `/admin/tournaments`.

- [ ] **Step 4: Build check**

Run:
```bash
cd apps/frontend
rtk next build
```
Expected: no TypeScript or build errors.

- [ ] **Step 5: Commit**

```bash
rtk git add apps/frontend/components/TopNav.tsx
rtk git commit -m "feat(nav): add /admin/tournaments link to admin menu"
```

---

## Task 2: Theme Tournament Status Pill

**Files:**
- Modify: `apps/frontend/components/tournament/StatusPill.tsx`

**Interfaces:**
- Consumes: `TournamentStatus`, `MatchStatus` enums.
- Produces: `StatusPill` component using `ui/Badge` variants.

- [ ] **Step 1: Replace implementation with ui/Badge**

Rewrite `StatusPill.tsx` to use the existing `Badge` primitive:

```tsx
"use client";

import {
  TournamentStatus,
  MatchStatus,
  TournamentStatusLabels,
  MatchStatusLabels,
} from "@/types/tournament.types";
import { Badge } from "@/components/ui/Badge";

interface StatusPillProps {
  status: TournamentStatus | MatchStatus | string;
  size?: "sm" | "md" | "lg";
}

const statusMap: Record<string, { variant: "default" | "success" | "warning" | "danger" | "info"; label: string }> = {
  [TournamentStatus.DRAFT]: { variant: "default", label: TournamentStatusLabels[TournamentStatus.DRAFT] },
  [TournamentStatus.IN_PROGRESS]: { variant: "info", label: TournamentStatusLabels[TournamentStatus.IN_PROGRESS] },
  [TournamentStatus.COMPLETED]: { variant: "success", label: TournamentStatusLabels[TournamentStatus.COMPLETED] },
  [TournamentStatus.CANCELLED]: { variant: "danger", label: TournamentStatusLabels[TournamentStatus.CANCELLED] },
  [MatchStatus.SCHEDULED]: { variant: "default", label: MatchStatusLabels[MatchStatus.SCHEDULED] },
  [MatchStatus.ONGOING]: { variant: "info", label: MatchStatusLabels[MatchStatus.ONGOING] },
  [MatchStatus.COMPLETED]: { variant: "success", label: MatchStatusLabels[MatchStatus.COMPLETED] },
  [MatchStatus.CANCELLED]: { variant: "danger", label: MatchStatusLabels[MatchStatus.CANCELLED] },
  [MatchStatus.WALKOVER]: { variant: "warning", label: MatchStatusLabels[MatchStatus.WALKOVER] },
};

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  const config = statusMap[status] || { variant: "default", label: status };
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
}

export default StatusPill;
```

- [ ] **Step 2: Check Badge primitive supports size prop**

Read `apps/frontend/components/ui/Badge.tsx`. If it does not accept `size`, add the optional prop or remove the `size` usage from `StatusPill`.

- [ ] **Step 3: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/StatusPill.tsx
rtk git commit -m "refactor(tournament): theme StatusPill with ui/Badge"
```

---

## Task 3: Theme Tournament Tabs and Fix Prop Sync

**Files:**
- Modify: `apps/frontend/components/tournament/TournamentTabs.tsx`

**Interfaces:**
- Consumes: `TabId`, `TournamentStatus`.
- Produces: synced tab bar with brand styling.

- [ ] **Step 1: Remove ChevronRight import and add useEffect sync**

Rewrite the component:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import type { TournamentStatus } from "@/types/tournament.types";
import { Calendar, Users, BarChart3, Settings, Trophy } from "lucide-react";

type TabId = "overview" | "teams" | "matches" | "brackets" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: <Calendar size={16} /> },
  { id: "teams", label: "Teams", icon: <Users size={16} /> },
  { id: "matches", label: "Matches", icon: <BarChart3 size={16} /> },
  { id: "brackets", label: "Brackets", icon: <Trophy size={16} /> },
  { id: "settings", label: "Settings", icon: <Settings size={16} />, adminOnly: true },
];

interface TournamentTabsProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  tournamentStatus?: TournamentStatus;
  isAdmin?: boolean;
}

export function TournamentTabs({
  activeTab = "overview",
  onTabChange,
  isAdmin = false,
}: TournamentTabsProps) {
  const [currentTab, setCurrentTab] = useState<TabId>(activeTab);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tabId: TabId) => {
    setCurrentTab(tabId);
    onTabChange?.(tabId);
  };

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <div className="border-b border-brand-border">
      <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab) => {
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary"
                  : "text-brand-textMuted hover:text-brand-text hover:bg-white/[0.04]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

interface TabPanelProps {
  id: TabId;
  activeTab: TabId;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (id !== activeTab) return null;
  return <div className={className}>{children}</div>;
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/TournamentTabs.tsx
rtk git commit -m "refactor(tournament): theme TournamentTabs and fix activeTab sync"
```

---

## Task 4: Theme TournamentForm and Add Scoring Config Editor

**Files:**
- Modify: `apps/frontend/components/tournament/TournamentForm.tsx`

**Interfaces:**
- Consumes: `CreateTournamentDto`, form change/submit callbacks.
- Produces: themed form using `Input`, `Select`, `Button`, `FormSection`.

- [ ] **Step 1: Replace raw inputs with existing primitives**

Use `apps/frontend/components/ui/Input.tsx`, `Select.tsx`, `Button.tsx`, `FormSection.tsx`, `Label.tsx`.

Example structure:

```tsx
"use client";

import { useState } from "react";
import type { CreateTournamentDto } from "@/types/tournament.types";
import {
  SportType,
  TournamentFormat,
  ParticipantType,
  ScoringMode,
  SchedulingMode,
} from "@/types/tournament.types";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Label } from "@/components/ui/Label";
import { Trophy, Calendar, Clock, Save, X } from "lucide-react";

interface TournamentFormProps {
  initialData?: Partial<CreateTournamentDto>;
  onSubmit: (data: Partial<CreateTournamentDto>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const sportOptions = Object.values(SportType).map((v) => ({ value: v, label: v }));
const formatOptions = Object.values(TournamentFormat).map((v) => ({ value: v, label: v }));
const participantOptions = Object.values(ParticipantType).map((v) => ({ value: v, label: v }));
const scoringOptions = Object.values(ScoringMode).map((v) => ({ value: v, label: v }));

export function TournamentForm({ initialData, onSubmit, onCancel, isLoading }: TournamentFormProps) {
  const [formData, setFormData] = useState<CreateTournamentDto>({
    name: initialData?.name || "",
    sportType: initialData?.sportType || SportType.OTHER,
    formatType: initialData?.formatType || TournamentFormat.SINGLE_ELIM,
    participantType: initialData?.participantType || ParticipantType.TEAM,
    scoringMode: initialData?.scoringMode || ScoringMode.SIMPLE,
    scoringConfig: initialData?.scoringConfig || { maxSets: 3, targetPoints: 21 },
    schedulingMode: initialData?.schedulingMode || SchedulingMode.MANUAL,
    courtCount: initialData?.courtCount || 1,
    startDate: initialData?.startDate || undefined,
    endDate: initialData?.endDate || undefined,
    eventId: initialData?.eventId || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof CreateTournamentDto>(key: K, value: CreateTournamentDto[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = "Name is required";
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      nextErrors.endDate = "End date must be after start date";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    try {
      await onSubmit(formData);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to save tournament" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Basic Information" icon={<Trophy size={18} />}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Enter tournament name"
              error={errors.name}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sport Type"
              value={formData.sportType}
              onChange={(v) => updateField("sportType", v as SportType)}
              options={sportOptions}
            />
            <Select
              label="Participant Type"
              value={formData.participantType}
              onChange={(v) => updateField("participantType", v as ParticipantType)}
              options={participantOptions}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Format Settings" icon={<Calendar size={18} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Format"
            value={formData.formatType}
            onChange={(v) => updateField("formatType", v as TournamentFormat)}
            options={formatOptions}
          />
          <Select
            label="Scoring Mode"
            value={formData.scoringMode}
            onChange={(v) => updateField("scoringMode", v as ScoringMode)}
            options={scoringOptions}
          />
          {formData.scoringMode === ScoringMode.SETS && (
            <>
              <Input
                type="number"
                label="Max Sets"
                value={formData.scoringConfig?.maxSets ?? 3}
                onChange={(e) =>
                  updateField("scoringConfig", {
                    ...formData.scoringConfig,
                    maxSets: parseInt(e.target.value, 10),
                  })
                }
                min={1}
              />
              <Input
                type="number"
                label="Target Points"
                value={formData.scoringConfig?.targetPoints ?? 21}
                onChange={(e) =>
                  updateField("scoringConfig", {
                    ...formData.scoringConfig,
                    targetPoints: parseInt(e.target.value, 10),
                  })
                }
                min={1}
              />
            </>
          )}
          <Select
            label="Scheduling"
            value={formData.schedulingMode}
            onChange={(v) => updateField("schedulingMode", v as SchedulingMode)}
            options={[
              { value: SchedulingMode.MANUAL, label: "Manual" },
              { value: SchedulingMode.AUTO, label: "Automatic" },
            ]}
          />
          <Input
            type="number"
            label="Courts / Fields"
            value={formData.courtCount}
            onChange={(e) => updateField("courtCount", parseInt(e.target.value, 10))}
            min={1}
            max={20}
          />
        </div>
      </FormSection>

      <FormSection title="Schedule" icon={<Clock size={18} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label="Start Date"
            value={formData.startDate?.slice(0, 16) || ""}
            onChange={(e) => updateField("startDate", e.target.value)}
          />
          <Input
            type="datetime-local"
            label="End Date"
            value={formData.endDate?.slice(0, 16) || ""}
            onChange={(e) => updateField("endDate", e.target.value)}
            error={errors.endDate}
          />
        </div>
      </FormSection>

      {errors.submit && (
        <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            <X size={16} /> Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          <Save size={16} /> Save Tournament
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify primitive APIs match**

Read each primitive used. Adjust prop names (`error`, `label`, `options`) to match the actual component signatures.

- [ ] **Step 3: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/TournamentForm.tsx
rtk git commit -m "refactor(tournament): theme TournamentForm and add scoring config editor"
```

---

## Task 5: Fix Match Score Undefined Bug and Theme Match Components

**Files:**
- Modify: `apps/frontend/components/tournament/match/MatchCard.tsx`
- Modify: `apps/frontend/components/tournament/match/LiveMatchDisplay.tsx`
- Modify: `apps/frontend/components/tournament/match/LiveMatchCard.tsx`
- Modify: `apps/frontend/components/tournament/match/MatchTimer.tsx`
- Modify: `apps/frontend/components/tournament/match/ScoreInput.tsx`

**Interfaces:**
- Consumes: `Match` type.
- Produces: themed, bug-free match cards and score input.

- [ ] **Step 1: Fix `hasScores` checks**

In `MatchCard.tsx` and `LiveMatchDisplay.tsx`, change:

```tsx
const hasScores = match.scoreA !== null && match.scoreB !== null;
```

To:

```tsx
const hasScores = typeof match.scoreA === "number" && typeof match.scoreB === "number";
```

- [ ] **Step 2: Theme MatchCard**

Replace generic gray/blue/green/red classes with brand tokens. Keep layout. Use `StatusPill` for the status badge.

Key replacements:
- `bg-white dark:bg-gray-800` → `bg-brand-surface`
- `border-gray-200 dark:border-gray-700` → `border-brand-border`
- `text-gray-900 dark:text-white` → `text-brand-text`
- `text-gray-600 dark:text-gray-300` → `text-brand-textMuted`
- `bg-red-500` live badge → `bg-brand-danger`
- winner checkmark color → `text-brand-success`

- [ ] **Step 3: Theme LiveMatchDisplay**

Replace `bg-gray-900`, `ring-red-500`, `bg-red-600` with brand tokens. Use `StatusPill`.

- [ ] **Step 4: Theme LiveMatchCard and replace img with Image**

Use `import Image from "next/image"` and replace both raw `<img>` tags. Replace `slate-*` classes with brand surfaces/borders.

- [ ] **Step 5: Clean MatchTimer**

Remove unused `isDarkMode` prop and dead ternary.

```tsx
interface MatchTimerProps {
  startTime: string;
}

export function MatchTimer({ startTime }: MatchTimerProps) {
  const [elapsed, setElapsed] = useState("00:00");
  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, "0");
      const s = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  return <span className="font-mono text-white">{elapsed}</span>;
}
```

- [ ] **Step 6: Theme ScoreInput**

Replace custom inputs/buttons with `Input` and `Button`. Replace `bg-green-600` with brand primary.

- [ ] **Step 7: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/match/
rtk git commit -m "refactor(tournament): theme match components and fix undefined score bug"
```

---

## Task 6: Fix Bracket Connector Direction and Theme Bracket Components

**Files:**
- Modify: `apps/frontend/components/tournament/bracket/BracketView.tsx`
- Modify: `apps/frontend/components/tournament/bracket/BracketConnector.tsx`
- Modify: `apps/frontend/components/tournament/bracket/BracketMatchBox.tsx`

**Interfaces:**
- Consumes: `BracketViewType`, `BracketRoundView`, `BracketMatchView`.
- Produces: correctly connected, themed bracket.

- [ ] **Step 1: Fix connector rendering logic in BracketView**

Draw connectors on matches that have a previous round (not the first round), not on matches that have a next round. Update the `showConnector` condition:

```tsx
const showConnector = roundIndex > 0;
```

Remove the unused `previousMatches` calculation or keep it only if the connector component needs slot info.

- [ ] **Step 2: Fix BracketConnector SVG clipping**

Make the SVG height match the full column and use `overflow-visible` or compute relative offsets. Minimal fix:

```tsx
<svg
  className="absolute top-0 -left-8 w-8 overflow-visible"
  style={{ height: "100%" }}
  // ...
>
```

Ensure the horizontal/vertical lines are drawn relative to the match box center, not absolute `matchIndex * totalHeight`.

- [ ] **Step 3: Theme BracketMatchBox**

Replace `bg-gray-800`, `border-gray-600`, `border-red-500`, `border-yellow-400` with brand tokens.

- [ ] **Step 4: Remove unused imports**

Remove `MatchStatus` and `MatchStatusLabels` from `BracketMatchBox.tsx` if unused.

- [ ] **Step 5: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/bracket/
rtk git commit -m "refactor(tournament): fix bracket connectors and theme bracket"
```

---

## Task 7: Theme Team Components

**Files:**
- Modify: `apps/frontend/components/tournament/team/TeamCard.tsx`
- Modify: `apps/frontend/components/tournament/team/TeamMemberList.tsx`
- Modify: `apps/frontend/components/tournament/team/TeamLogo.tsx`

**Interfaces:**
- Consumes: `TournamentTeam`, `TeamMember`.
- Produces: themed team card, member list, and logo fallback.

- [ ] **Step 1: Theme TeamCard with ui/Card**

Wrap content in `Card` from `ui/Card.tsx`. Replace generic colors with brand tokens.

- [ ] **Step 2: Theme TeamMemberList**

Replace gray backgrounds with `bg-brand-surfaceMuted` and muted text with `text-brand-textMuted`.

- [ ] **Step 3: Theme TeamLogo fallback**

Use brand-primary/primaryMuted/surfaceBright palette for fallback circles instead of `blue/green/yellow/purple/pink`.

- [ ] **Step 4: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/team/
rtk git commit -m "refactor(tournament): theme team components"
```

---

## Task 8: Theme Tournament Admin Pages

**Files:**
- Modify: `apps/frontend/app/(main)/admin/tournaments/page.tsx`
- Modify: `apps/frontend/app/(main)/admin/tournaments/new/page.tsx`
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `tournamentApi`, `matchApi`, `bracketApi`, tournament components.
- Produces: themed, functional admin pages using existing primitives.

- [ ] **Step 1: Theme list page (`/admin/tournaments`)**

Use `Button`, `Input`, `Card`, `Modal` primitives. Replace `bg-blue-600`, `bg-gray-*`, `text-gray-*` with brand tokens.

- [ ] **Step 2: Theme new/edit pages**

Use `Card` for form container, `Button` for actions.

- [ ] **Step 3: Theme detail page and fix type casts**

Replace `as any` casts:
- `status: 'IN_PROGRESS' as any` → `status: TournamentStatus.IN_PROGRESS`
- `bracket={tournament.brackets[0] as any}` → convert `TournamentBracket` to `BracketView` or use `bracketApi.getView(tournamentId)`.

Add a `useEffect` to fetch bracket view when the Brackets tab is active:

```tsx
const [bracketView, setBracketView] = useState<BracketViewType | null>(null);
useEffect(() => {
  if (activeTab === "brackets" && tournamentId) {
    bracketApi.getView(tournamentId).then(setBracketView).catch(console.error);
  }
}, [activeTab, tournamentId]);
```

Then render `<BracketView bracket={bracketView} />` instead of `tournament.brackets[0]`.

- [ ] **Step 4: Implement missing quick-link targets**

Instead of creating separate `/matches` and `/teams` pages, update the Overview quick links to scroll to the matching tab:

```tsx
<Link
  href="#teams"
  onClick={() => setActiveTab("teams")}
  // ...
>
```

Or create minimal placeholder pages at `apps/frontend/app/(main)/admin/tournaments/[id]/teams/page.tsx` and `matches/page.tsx` that redirect to the detail page with the correct tab query param. The simpler solution is tab-scrolling.

- [ ] **Step 5: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/app/\(main\)/admin/tournaments/
rtk git commit -m "refactor(tournament): theme admin pages and fix type casts"
```

---

## Task 9: Theme Public Bracket Viewer and Fix Public SSE

**Files:**
- Modify: `apps/frontend/app/(main)/tournament/bracket/[id]/page.tsx`
- Modify: `apps/frontend/lib/sse-context.tsx` (read only, do not modify unless required)

**Interfaces:**
- Consumes: `tournamentApi`, `bracketApi`, `useTournamentSSE`.
- Produces: themed public bracket page that works without auth.

- [ ] **Step 1: Theme public bracket page**

Replace `bg-gray-900`, `bg-gray-100`, `border-gray-800`, `text-gray-*`, `bg-blue-600`, `bg-green-600` with brand tokens. Use `Button` for the Back to Home action.

- [ ] **Step 2: Verify SSE behavior for public visitors**

Read `apps/frontend/lib/sse-context.tsx`. If it requires `localStorage.getItem('token')` to connect, the public bracket page cannot receive real-time updates. Options:

1. Allow SSE connection without token for public events (if backend supports anonymous SSE).
2. Disable `useTournamentSSE` when no token is present and poll `bracketApi.getView` every 10 seconds as fallback.

Implement option 2 as the safest minimal change:

```tsx
const isAuth = typeof window !== "undefined" && !!localStorage.getItem("token");
const sse = useTournamentSSE(tournamentId);

useEffect(() => {
  if (!isAuth) return;
  // ... existing SSE handlers
}, [sse, isAuth]);

useEffect(() => {
  if (isAuth) return;
  const id = setInterval(() => {
    bracketApi.getView(tournamentId).then(setBracket).catch(console.error);
  }, 10000);
  return () => clearInterval(id);
}, [tournamentId, isAuth]);
```

- [ ] **Step 3: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/app/\(main\)/tournament/bracket/\[id\]/page.tsx
rtk git commit -m "refactor(tournament): theme public bracket and add anonymous fallback"
```

---

## Task 10: Tighten Landing Page Section Spacing

**Files:**
- Modify: `apps/frontend/components/landing/Hero.tsx`
- Modify: `apps/frontend/components/landing/Features.tsx`
- Modify: `apps/frontend/components/landing/Gallery.tsx`
- Modify: `apps/frontend/app/page.tsx`

**Interfaces:**
- Consumes: landing page data and toggles.
- Produces: sections with dynamic, compact spacing.

- [ ] **Step 1: Add optional spacing props to Hero**

```tsx
interface HeroProps {
  headline?: string;
  subtext?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  images?: HeroImage[];
  compact?: boolean;
}

export default function Hero({ ..., compact = false }: HeroProps) {
  return (
    <section className={cn("pt-20", compact ? "pb-12 min-h-auto" : "pb-16 min-h-[100dvh]")}>
      ...
    </section>
  );
}
```

Add local `cn` helper.

- [ ] **Step 2: Reduce Features spacing and add props**

```tsx
interface FeaturesProps {
  features: Feature[];
  title?: string;
  subtext?: string;
  compact?: boolean;
}

export default function Features({ features, title, subtext, compact = false }: FeaturesProps) {
  if (features.length === 0) return null;
  return (
    <section className={compact ? "py-16" : "py-24"}>
      <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", compact ? "space-y-16" : "space-y-24")}>
        ...
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Reduce Gallery spacing and add props**

```tsx
interface GalleryProps {
  title?: string;
  subtext?: string;
  images: GalleryImage[];
  compact?: boolean;
}

export default function Gallery({ title, subtext, images, compact = false }: GalleryProps) {
  if (images.length === 0) return null;
  return (
    <section className={compact ? "py-16" : "py-24"}>
      ...
    </section>
  );
}
```

- [ ] **Step 4: Wire compact mode from page.tsx**

Pass `compact={true}` when adjacent sections are visible:

```tsx
{toggles.showHero && (
  <Hero ... compact={toggles.showFeatures || toggles.showGallery} />
)}
{toggles.showFeatures && landingData?.features && (
  <Features
    ...
    compact={toggles.showHero || toggles.showGallery}
  />
)}
{toggles.showGallery && landingData?.gallery && (
  <Gallery
    ...
    compact={toggles.showHero || toggles.showFeatures}
  />
)}
```

- [ ] **Step 5: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/landing/ apps/frontend/app/page.tsx
rtk git commit -m "refactor(landing): dynamic compact spacing between sections"
```

---

## Task 11: Final Verification

**Files:**
- All modified files above.

- [ ] **Step 1: Run full frontend build**

```bash
cd apps/frontend
rtk next build
```
Expected: build succeeds with zero errors.

- [ ] **Step 2: Run backend build**

```bash
cd apps/backend
rtk npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Smoke test navigation**

Run dev servers, log in, open `/admin/tournaments`, create a tournament, open detail page, switch tabs, generate bracket, open public bracket `/tournament/bracket/{id}`.

- [ ] **Step 4: Push**

```bash
rtk git push
```

---

## Spec Coverage

| Requirement | Task |
|---|---|
| `/admin/tournaments` reachable | Task 1 |
| Tournament theme matches existing UI | Tasks 2–9 |
| Runtime score undefined bug fixed | Task 5 |
| Bracket connector visual bugs fixed | Task 6 |
| Tab active prop sync fixed | Task 3 |
| Public bracket works without auth | Task 9 |
| Landing page gaps tightened dynamically | Task 10 |

## Placeholder Scan

No TBD/TODO/fill-in-details. All code snippets are concrete. Where a primitive signature might differ (e.g. `Badge` size), the task instructs reading the primitive first.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-30-tournament-frontend-theme-and-landing-spacing.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`.

**Which approach?**
