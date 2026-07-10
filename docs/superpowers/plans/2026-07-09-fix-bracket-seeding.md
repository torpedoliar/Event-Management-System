# Fix Random Bracket Generation Logic - Implementation Plan

Goal: Fix bug di logic generate bracket tournament dimana seeding tim menggunakan name.length sebagai fallback ketika seed null.
> For agentic workers: This plan is fully self-contained. Implement tasks in order.
Fix: ganti fallback name.length dengan Fisher-Yates shuffle. Tim dengan seed manual tetap dipertahankan.

---

## Global Constraints

- ONLY modify tournaments.service.ts
- DO NOT modify bracket-engine, schema, DTOs, controller, frontend, or tests
- Must compile with npm run build

---
## Phase 1: Add assignSeeds Helper Method

### Task 1.1: Create the seed-assignment helper

**File (MODIFY):** apps/backend/src/tournaments/tournaments.service.ts

Add this private method BEFORE generateBracket (before line 417):

code block:
```
  private assignSeeds(
    teams: { id: string; name: string; seed: number | null }[],
  ): { id: string; name: string; seed: number }[] {
    const seeded = teams.filter((t) => t.seed != null);
    const unseeded = teams.filter((t) => t.seed == null);
    if (unseeded.length === 0) return seeded;
    for (let i = unseeded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]];
    }
    const maxSeed = seeded.length > 0 ? Math.max(...seeded.map((t) => t.seed)) : 0;
    let nextSeed = maxSeed + 1;
    const unseededWithSeeds = unseeded.map((t) => ({ id: t.id, name: t.name, seed: nextSeed++ }));
    return [...seeded, ...unseededWithSeeds];
  }
```
---
## Phase 2: Fix generateBracket Method

### Task 2.1: Replace name.length fallback with assignSeeds

In generateBracket (line 417), find this code around lines 429-433:

```
    const teams = tournament.teams.map((t) => ({
      id: t.id,
      name: t.name,
      seed: t.seed ?? t.name.length,
    }));
```

Replace with:

```
    const teams = this.assignSeeds(
      tournament.teams.map((t) => ({
        id: t.id,
        name: t.name,
        seed: t.seed,
      })),
    );
```

Rest of generateBracket stays unchanged.

---

## Phase 3: Fix regenerateBracket Method

### Task 3.1: Replace name.length fallback with assignSeeds

In regenerateBracket (line 769), find this code around lines 780-784:

Same bug. Replace identical code with assignSeeds() call (same as Phase 2).

Rest of regenerateBracket stays unchanged.

---

## Phase 4: Build Verification

- [ ] Step 1: Build backend
cd apps/backend && npm run build
Must pass with zero TypeScript errors.

- [ ] Step 2: Run existing tests (if DB available)
cd apps/backend && npx jest test/tournaments/bracket-engine.spec.ts
Tests use explicit seeds, all should still pass.

---

## Phase 5: Manual End-to-End Test

### Test Case 1: Unseeded teams (bug scenario)
- Create 5 teams (no manual seeds), generate bracket
- Verify real matches exist, BYE randomly distributed
- Regenerate => different bracket each time

### Test Case 2: Mixed seeds (manual + unseeded)
- 2 teams with manual seed, 4 without
- Manual seeds stay fixed, unseeded shuffle on regenerate

### Test Case 3: All manual seeds (no shuffle)
- 4 teams with seeds 1,2,3,4
- Always same bracket (no random element)

---

## Summary

Modified File (ONLY ONE):
- tournaments.service.ts: Add assignSeeds() helper, replace name.length fallback

Files NOT Modified:
- bracket-engine.service.ts: all correct
- schema.prisma: seed Int? nullable correct
- DTOs, controller, frontend, tests: all correct

Before-After:
| Aspect | Before | After |
|--------|--------|-------|
| Null seed fallback | t.name.length (deterministic) | Fisher-Yates shuffle (random) |
| Regenerate result | Always same bracket | Different each time |
| Seed collisions | Yes | No (sequential) |
| Manual seeds | Ignored | Preserved |
| Design spec | Not implemented | Implemented |
## Phase 5: Manual End-to-End Test

### Test Case 1: Unseeded teams
- Create 5 teams (no manual seeds), generate bracket
- Verify real matches exist, BYE randomly distributed
- Regenerate => different bracket each time

### Test Case 2: Mixed seeds (manual + unseeded)
- 2 teams with manual seed, 4 without
- Manual seeds stay fixed, unseeded shuffle on regenerate

### Test Case 3: All manual seeds (no shuffle)
- 4 teams with seeds 1,2,3,4
- Always same bracket (no random element)

---

## Summary

### Modified File (ONLY ONE)
tournaments.service.ts: Add assignSeeds() helper, replace name.length fallback in generateBracket and regenerateBracket

### Files NOT Modified
- bracket-engine.service.ts: all correct
- schema.prisma: seed Int? nullable correct
- DTOs, controller, frontend, tests: all correct

### Before-After Comparison
| Aspect | Before | After |
|--------|--------|-------|
| Null seed fallback | t.name.length (deterministic) | Fisher-Yates shuffle (random) |
| Regenerate result | Always same bracket | Different each time |
| Seed collisions | Yes | No (sequential) |
| Manual seeds | Ignored | Preserved |
| Design spec | Not implemented | Implemented |
