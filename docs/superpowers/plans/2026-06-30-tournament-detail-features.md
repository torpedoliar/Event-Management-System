# Tournament Detail Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the missing Manage Matches, Team Management, Teams tab actions, and Settings tab inside the tournament detail page so admins can fully operate a competition from the UI.

**Architecture:** Keep all new functionality inside the existing detail page (`/admin/tournaments/[id]`) using modals for create/edit actions. Reuse the existing API client (`tournamentApi`, `teamApi`, `matchApi`, `bracketApi`), UI primitives (`Modal`, `Button`, `Input`, `Select`, `Card`, `FormSection`, `Label`), and brand theme tokens.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, Lucide React, existing `apps/frontend/components/ui/*` primitives, `apps/frontend/lib/tournament-api.ts`.

## Global Constraints

- Reuse existing UI primitives; do not reinvent buttons, inputs, selects, cards, or modals.
- Use brand theme tokens (`bg-brand-bg`, `bg-brand-surface`, `border-brand-border`, `text-brand-text`, `text-brand-textMuted`, `text-brand-primary`, `text-brand-success`, `text-brand-warning`, `text-brand-danger`, `focus:ring-brand-primary/50`).
- Do not add new dependencies.
- Preserve existing data contracts and API endpoints.
- Each task ends with `cd apps/frontend && rtk next build` passing and a commit.
- `rtk` prefix for all shell commands per global CLAUDE.md.

---

## File Structure

### New components
- `apps/frontend/components/tournament/match/MatchScoringModal.tsx` — start/score/cancel/walkover match.
- `apps/frontend/components/tournament/team/TeamFormModal.tsx` — create/edit team.
- `apps/frontend/components/tournament/team/TeamMemberFormModal.tsx` — add team member.

### Modified files
- `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx` — add Settings tab, wire team/match modals, fix broken Add Team button.
- `apps/frontend/components/tournament/team/TeamCard.tsx` — add edit/delete/member actions.
- `apps/frontend/components/tournament/match/MatchCard.tsx` — add onClick to open scoring modal.

---

## Task 1: Add Match Scoring Modal

**Files:**
- Create: `apps/frontend/components/tournament/match/MatchScoringModal.tsx`
- Modify: `apps/frontend/components/tournament/match/MatchCard.tsx`
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`

**Interfaces:**
- Consumes: `Match`, `ScoringMode`, `matchApi`, existing `ScoreInput`.
- Produces: `MatchScoringModal` component with handlers `onUpdate`, `onStart`, `onCancel`, `onWalkover`.

- [ ] **Step 1: Create MatchScoringModal component**

Create `apps/frontend/components/tournament/match/MatchScoringModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Match, UpdateScoreDto, TournamentTeam } from "@/types/tournament.types";
import { MatchStatus, ScoringMode } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ScoreInput } from "./ScoreInput";
import { StatusPill } from "../StatusPill";
import { Play, XCircle, Flag, Swords } from "lucide-react";

interface MatchScoringModalProps {
  match: Match | null;
  scoringMode: ScoringMode;
  maxSets?: number;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function MatchScoringModal({
  match,
  scoringMode,
  maxSets = 3,
  open,
  onClose,
  onUpdate,
}: MatchScoringModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!match) return null;

  const teamOptions: { value: string; label: string }[] = [
    { value: match.teamAId || "", label: match.teamA?.name || "Team A" },
    { value: match.teamBId || "", label: match.teamB?.name || "Team B" },
  ].filter((t) => t.value);

  const handleStart = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.start(match.id));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start match");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScoreSubmit = async (score: UpdateScoreDto) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.updateScore(match.id, score));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update score");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this match?")) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.cancel(match.id));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel match");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWalkover = async (winnerId: string) => {
    if (!confirm(`Award walkover to ${teamOptions.find((t) => t.value === winnerId)?.label}?`)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await import("@/lib/tournament-api").then((m) => m.matchApi.awardWalkover(match.id, winnerId));
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to award walkover");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canStart = match.status === MatchStatus.SCHEDULED;
  const canScore = match.status === MatchStatus.ONGOING;
  const canCancel = match.status === MatchStatus.SCHEDULED || match.status === MatchStatus.ONGOING;
  const canWalkover = match.status === MatchStatus.SCHEDULED;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Match #${match.matchNumber}`}
      description={
        <div className="flex items-center gap-2">
          <StatusPill status={match.status} size="sm" />
          {match.court && <span className="text-brand-textMuted text-sm">· Court {match.court}</span>}
        </div>
      }
      className="max-w-xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
            {error}
          </div>
        )}

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button onClick={handleStart} loading={isSubmitting}>
              <Play size={16} /> Start Match
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel} loading={isSubmitting}>
              <XCircle size={16} /> Cancel
            </Button>
          )}
          {canWalkover && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-textMuted">Walkover:</span>
              {teamOptions.map((team) => (
                <Button
                  key={team.value}
                  variant="warning"
                  size="sm"
                  onClick={() => handleWalkover(team.value)}
                  loading={isSubmitting}
                >
                  <Flag size={14} /> {team.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Score input for ongoing matches */}
        {canScore && (
          <ScoreInput
            match={match}
            scoringMode={scoringMode}
            maxSets={maxSets}
            onSubmit={handleScoreSubmit}
            onCancel={onClose}
          />
        )}

        {!canScore && !canStart && (
          <div className="text-center py-8 text-brand-textMuted text-sm">
            This match is {match.status.toLowerCase().replace("_", " ")}.
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Make MatchCard clickable**

In `apps/frontend/components/tournament/match/MatchCard.tsx`, add an `onClick` prop and cursor styling. If `onClick` is provided, render the card as a button or attach `onClick` to the root div.

```tsx
interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  // ...existing props
}

export function MatchCard({ match, onClick, ... }: MatchCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-brand-border bg-brand-surface p-4 transition-all",
        onClick && "cursor-pointer hover:border-brand-borderHover hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      {/* existing content */}
    </div>
  );
}
```

- [ ] **Step 3: Wire modal into detail page Matches tab**

In `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`:

```tsx
const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
const [matchModalOpen, setMatchModalOpen] = useState(false);

const handleMatchClick = (match: Match) => {
  setSelectedMatch(match);
  setMatchModalOpen(true);
};

const refreshMatches = async () => {
  if (!tournamentId) return;
  const data = await matchApi.getByTournament(tournamentId);
  setMatches(data);
  const t = await tournamentApi.getById(tournamentId);
  setTournament(t);
  setTeams(t.teams || []);
};
```

Update each `<MatchCard onClick={() => handleMatchClick(match)} />` and add the modal at the bottom of the page:

```tsx
<MatchScoringModal
  match={selectedMatch}
  scoringMode={tournament?.scoringMode || ScoringMode.SIMPLE}
  maxSets={tournament?.scoringConfig?.maxSets || 3}
  open={matchModalOpen}
  onClose={() => {
    setMatchModalOpen(false);
    setSelectedMatch(null);
  }}
  onUpdate={refreshMatches}
/>
```

- [ ] **Step 4: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/match/MatchScoringModal.tsx
rtk git add apps/frontend/components/tournament/match/MatchCard.tsx
rtk git add apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
rtk git commit -m "feat(tournament): add match scoring modal with start/score/cancel/walkover"
```

---

## Task 2: Add Team Form Modal (Create/Edit)

**Files:**
- Create: `apps/frontend/components/tournament/team/TeamFormModal.tsx`
- Modify: `apps/frontend/components/tournament/team/TeamCard.tsx`
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`

**Interfaces:**
- Consumes: `CreateTeamDto`, `TournamentTeam`, `teamApi`.
- Produces: `TeamFormModal` with `onSuccess` callback.

- [ ] **Step 1: Create TeamFormModal component**

Create `apps/frontend/components/tournament/team/TeamFormModal.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import type { CreateTeamDto, TournamentTeam } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { teamApi } from "@/lib/tournament-api";
import { Users, Trash2 } from "lucide-react";

interface TeamFormModalProps {
  tournamentId: string;
  team?: TournamentTeam | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeamFormModal({ tournamentId, team, open, onClose, onSuccess }: TeamFormModalProps) {
  const [name, setName] = useState("");
  const [seed, setSeed] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(team?.name || "");
      setSeed(team?.seed?.toString() || "");
      setLogoUrl(team?.logoUrl || "");
      setError(null);
    }
  }, [open, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const data: CreateTeamDto = {
      name: name.trim(),
      seed: seed ? parseInt(seed, 10) : undefined,
      logoUrl: logoUrl.trim() || undefined,
    };

    try {
      if (team) {
        await teamApi.update(team.id, data);
      } else {
        await teamApi.create(tournamentId, data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!team || !confirm("Delete this team?")) return;
    setIsSubmitting(true);
    try {
      await teamApi.delete(team.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete team");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team ? "Edit Team" : "Add Team"}
      description={team ? `Update ${team.name}` : "Register a new team for this tournament"}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="team-name">Team Name *</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Red Dragons"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="team-seed">Seed</Label>
            <Input
              id="team-seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="1"
              min={1}
            />
          </div>
          <div>
            <Label htmlFor="team-logo">Logo URL</Label>
            <Input
              id="team-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {team && (
            <Button type="button" variant="danger" onClick={handleDelete} loading={isSubmitting}>
              <Trash2 size={16} /> Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            <Users size={16} /> {team ? "Save" : "Add Team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Add edit/delete actions to TeamCard**

Modify `apps/frontend/components/tournament/team/TeamCard.tsx` to accept `onEdit` and `onDelete` props:

```tsx
interface TeamCardProps {
  team: TournamentTeam;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDarkMode?: boolean;
  showDetails?: boolean;
}

export function TeamCard({ team, onClick, onEdit, onDelete, showDetails = false }: TeamCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        onClick && "cursor-pointer hover:border-brand-borderHover"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TeamLogo src={team.logoUrl} name={team.name} size="lg" />
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-text truncate">{team.name}</h3>
            {team.seed && <p className="text-sm text-brand-textMuted">Seed #{team.seed}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <IconButton onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Edit team">
              <Edit size={16} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete team">
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Stats and members unchanged */}
    </Card>
  );
}
```

Add imports for `Card`, `IconButton`, `Edit`, `Trash2`, `cn`.

- [ ] **Step 3: Wire TeamFormModal into detail page**

In `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`:

```tsx
const [teamModalOpen, setTeamModalOpen] = useState(false);
const [editingTeam, setEditingTeam] = useState<TournamentTeam | null>(null);

const refreshTeams = async () => {
  if (!tournamentId) return;
  const t = await tournamentApi.getById(tournamentId);
  setTournament(t);
  setTeams(t.teams || []);
};
```

Update the Teams tab "Add Team" button:

```tsx
<button
  onClick={() => {
    setEditingTeam(null);
    setTeamModalOpen(true);
  }}
  className="..."
>
  <Plus size={16} /> Add Team
</button>
```

Replace `TeamCard` rendering with:

```tsx
{teams.map((team) => (
  <TeamCard
    key={team.id}
    team={team}
    showDetails
    onEdit={() => {
      setEditingTeam(team);
      setTeamModalOpen(true);
    }}
    onDelete={async () => {
      if (!confirm(`Delete team ${team.name}?`)) return;
      await teamApi.delete(team.id);
      refreshTeams();
    }}
    onClick={() => {
      setEditingTeam(team);
      setTeamModalOpen(true);
    }}
  />
))}
```

Add the modal:

```tsx
<TeamFormModal
  tournamentId={tournamentId}
  team={editingTeam}
  open={teamModalOpen}
  onClose={() => {
    setTeamModalOpen(false);
    setEditingTeam(null);
  }}
  onSuccess={refreshTeams}
/>
```

- [ ] **Step 4: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/team/TeamFormModal.tsx
rtk git add apps/frontend/components/tournament/team/TeamCard.tsx
rtk git add apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
rtk git commit -m "feat(tournament): add team create/edit/delete modal"
```

---

## Task 3: Add Team Member Management

**Files:**
- Create: `apps/frontend/components/tournament/team/TeamMemberFormModal.tsx`
- Modify: `apps/frontend/components/tournament/team/TeamMemberList.tsx`
- Modify: `apps/frontend/components/tournament/team/TeamCard.tsx`

**Interfaces:**
- Consumes: `TeamMember`, `teamApi`.
- Produces: `TeamMemberFormModal` with add/remove member actions.

- [ ] **Step 1: Create TeamMemberFormModal**

Create `apps/frontend/components/tournament/team/TeamMemberFormModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { TeamMember } from "@/types/tournament.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { teamApi } from "@/lib/tournament-api";
import { UserPlus, Trash2 } from "lucide-react";

interface TeamMemberFormModalProps {
  teamId: string;
  teamName: string;
  members: TeamMember[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TeamMemberFormModal({
  teamId,
  teamName,
  members,
  open,
  onClose,
  onSuccess,
}: TeamMemberFormModalProps) {
  const [name, setName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Member name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await teamApi.addMember(teamId, {
        name: name.trim(),
        jerseyNumber: jerseyNumber.trim() || undefined,
        role: role.trim() || undefined,
      });
      setName("");
      setJerseyNumber("");
      setRole("");
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      await teamApi.removeMember(memberId);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${teamName} — Members`}
      description={`${members.length} registered member(s)`}
      className="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-brand-danger/10 text-brand-danger border border-brand-danger/20 text-sm">
            {error}
          </div>
        )}

        <div className="max-h-48 overflow-y-auto space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-bg border border-brand-border"
            >
              <div>
                <p className="text-sm font-medium text-brand-text">{member.name}</p>
                {(member.role || member.jerseyNumber) && (
                  <p className="text-xs text-brand-textMuted">
                    {[member.role, member.jerseyNumber && `#${member.jerseyNumber}`].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <IconButton onClick={() => handleRemove(member.id)} aria-label="Remove member">
                <Trash2 size={16} />
              </IconButton>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-brand-border pt-4 space-y-3">
          <p className="text-sm font-medium text-brand-text">Add Member</p>
          <div>
            <Label htmlFor="member-name">Name *</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="member-jersey">Jersey #</Label>
              <Input
                id="member-jersey"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <Label htmlFor="member-role">Role</Label>
              <Input
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Captain"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
            <Button type="submit" size="sm" loading={isSubmitting}>
              <UserPlus size={16} /> Add
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Add members action to TeamCard**

Update `TeamCard` to accept `onManageMembers` and show a button:

```tsx
interface TeamCardProps {
  // ...existing
  onManageMembers?: () => void;
}

export function TeamCard({ team, onManageMembers, ... }: TeamCardProps) {
  return (
    <Card>
      {/* header with edit/delete */}

      {onManageMembers && (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onManageMembers(); }} className="mt-4 w-full">
          <Users size={14} /> Manage Members
        </Button>
      )}

      {/* existing members section if showDetails */}
    </Card>
  );
}
```

- [ ] **Step 3: Wire member modal in detail page**

In `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`:

```tsx
const [memberModalOpen, setMemberModalOpen] = useState(false);
const [memberTeam, setMemberTeam] = useState<TournamentTeam | null>(null);
```

Pass `onManageMembers` to `TeamCard`:

```tsx
<TeamCard
  team={team}
  showDetails
  onManageMembers={() => {
    setMemberTeam(team);
    setMemberModalOpen(true);
  }}
  // ...onEdit, onDelete, onClick
/>
```

Add modal:

```tsx
{memberTeam && (
  <TeamMemberFormModal
    teamId={memberTeam.id}
    teamName={memberTeam.name}
    members={memberTeam.members || []}
    open={memberModalOpen}
    onClose={() => {
      setMemberModalOpen(false);
      setMemberTeam(null);
    }}
    onSuccess={refreshTeams}
  />
)}
```

- [ ] **Step 4: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/components/tournament/team/TeamMemberFormModal.tsx
rtk git add apps/frontend/components/tournament/team/TeamCard.tsx
rtk git add apps/frontend/components/tournament/team/TeamMemberList.tsx
rtk git add apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
rtk git commit -m "feat(tournament): add team member management modal"
```

---

## Task 4: Implement Settings Tab

**Files:**
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`

**Interfaces:**
- Consumes: `Tournament`, `tournamentApi`, `bracketApi`.
- Produces: Settings tab with status management, edit/delete/regenerate actions.

- [ ] **Step 1: Add Settings TabPanel content**

Inside the tab content area of `page.tsx`, add:

```tsx
{/* Settings Tab */}
<TabPanel id="settings" activeTab={activeTab}>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Status Management */}
    <Card>
      <h3 className="text-heading-3 text-brand-text mb-4">Tournament Status</h3>
      <div className="flex items-center gap-3 mb-4">
        <StatusPill status={tournament.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {tournament.status === TournamentStatus.DRAFT && (
          <Button onClick={handleStartTournament}>
            <Play size={16} /> Start Tournament
          </Button>
        )}
        {tournament.status === TournamentStatus.IN_PROGRESS && (
          <Button
            onClick={async () => {
              if (!confirm("Mark tournament as completed?")) return;
              await tournamentApi.update(tournamentId, { status: TournamentStatus.COMPLETED });
              refreshTournament();
            }}
          >
            <CheckCircle size={16} /> Complete
          </Button>
        )}
        {(tournament.status === TournamentStatus.DRAFT || tournament.status === TournamentStatus.IN_PROGRESS) && (
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm("Cancel this tournament?")) return;
              await tournamentApi.update(tournamentId, { status: TournamentStatus.CANCELLED });
              refreshTournament();
            }}
          >
            <XCircle size={16} /> Cancel
          </Button>
        )}
      </div>
    </Card>

    {/* Bracket Management */}
    <Card>
      <h3 className="text-heading-3 text-brand-text mb-4">Bracket</h3>
      <p className="text-body-sm text-brand-textMuted mb-4">
        {tournament.brackets && tournament.brackets.length > 0
          ? "Bracket has been generated."
          : "No bracket generated yet."}
      </p>
      {tournament.status === TournamentStatus.DRAFT && teams.length >= 2 && (
        <Button onClick={handleGenerateBracket}>
          <BarChart3 size={16} /> Generate Bracket
        </Button>
      )}
    </Card>

    {/* Quick Actions */}
    <Card>
      <h3 className="text-heading-3 text-brand-text mb-4">Actions</h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" asChild>
          <Link href={`/admin/tournaments/${tournamentId}/edit`}>
            <Edit size={16} /> Edit Tournament
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/tournament/bracket/${tournamentId}`} target="_blank">
            <Trophy size={16} /> Public Bracket
          </Link>
        </Button>
      </div>
    </Card>

    {/* Danger Zone */}
    <Card className="border-brand-danger/30">
      <h3 className="text-heading-3 text-brand-danger mb-4">Danger Zone</h3>
      <p className="text-body-sm text-brand-textMuted mb-4">
        Deleting a tournament cannot be undone.
      </p>
      <Button
        variant="danger"
        onClick={async () => {
          if (!confirm("Permanently delete this tournament?")) return;
          await tournamentApi.delete(tournamentId);
          router.push("/admin/tournaments");
        }}
      >
        <Trash2 size={16} /> Delete Tournament
      </Button>
    </Card>
  </div>
</TabPanel>
```

Add missing icon imports (`CheckCircle`, `XCircle`).

- [ ] **Step 2: Add refreshTournament helper**

```tsx
const refreshTournament = async () => {
  if (!tournamentId) return;
  const t = await tournamentApi.getById(tournamentId);
  setTournament(t);
  setTeams(t.teams || []);
};
```

Use `refreshTournament` in `handleGenerateBracket` and `handleStartTournament`.

- [ ] **Step 3: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
rtk git commit -m "feat(tournament): implement settings tab with status and danger zone"
```

---

## Task 5: Remove Broken Quick Links or Create Sub-Routes

**Files:**
- Modify: `apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx`

**Interfaces:**
- Consumes: existing Overview quick links.
- Produces: quick links that navigate to working tabs.

- [ ] **Step 1: Update Overview quick links to scroll to tabs**

Change the three quick link cards in the Overview tab:

```tsx
<div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
  <button
    onClick={() => setActiveTab("matches")}
    className="text-left p-4 bg-brand-surface rounded-xl border border-brand-border hover:border-brand-primary/40 transition-colors"
  >
    <BarChart3 className="w-6 h-6 text-brand-primary mb-2" />
    <p className="font-medium text-brand-text">Manage Matches</p>
    <p className="text-sm text-brand-textMuted">View and edit match scores</p>
  </button>
  <Link
    href={`/tournament/bracket/${tournamentId}`}
    target="_blank"
    className="block p-4 bg-brand-surface rounded-xl border border-brand-border hover:border-brand-primary/40 transition-colors"
  >
    <Trophy className="w-6 h-6 text-brand-primary mb-2" />
    <p className="font-medium text-brand-text">Public Bracket</p>
    <p className="text-sm text-brand-textMuted">View bracket display</p>
  </Link>
  <button
    onClick={() => setActiveTab("teams")}
    className="text-left p-4 bg-brand-surface rounded-xl border border-brand-border hover:border-brand-primary/40 transition-colors"
  >
    <Users className="w-6 h-6 text-brand-primary mb-2" />
    <p className="font-medium text-brand-text">Team Management</p>
    <p className="text-sm text-brand-textMuted">Add and edit teams</p>
  </button>
</div>
```

- [ ] **Step 2: Build and commit**

```bash
cd apps/frontend
rtk next build
rtk git add apps/frontend/app/\(main\)/admin/tournaments/\[id\]/page.tsx
rtk git commit -m "fix(tournament): redirect overview quick links to working tabs"
```

---

## Task 6: Final Verification

**Files:** all modified above.

- [ ] **Step 1: Run full frontend build**

```bash
cd apps/frontend
rtk next build
```
Expected: zero errors.

- [ ] **Step 2: Smoke test flows**

1. Open `/admin/tournaments/[id]`.
2. Settings tab: start/cancel/complete tournament.
3. Teams tab: add team, edit team, delete team, manage members.
4. Matches tab: click a match, start it, enter score, complete it.
5. Overview: quick links switch to Teams/Matches tabs.

- [ ] **Step 3: Push**

```bash
rtk git push
```

---

## Spec Coverage

| Requirement | Task |
|---|---|
| Manage Matches (start/score/cancel/walkover) | Task 1 |
| Team Management (add/edit/delete) | Task 2 |
| Teams tab CRUD + members | Tasks 2–3 |
| Settings tab | Task 4 |
| Broken quick links fixed | Task 5 |

## Placeholder Scan

No TBD/TODO/fill-in-details. All code snippets are concrete. Adjust primitive prop names after reading actual component files.

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-30-tournament-detail-features.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`.

**Which approach?**
