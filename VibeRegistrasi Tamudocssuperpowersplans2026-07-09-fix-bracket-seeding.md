---
## Phase 1: Add assignSeeds Helper Method

### Task 1.1: Create the seed-assignment helper

**File (MODIFY):** apps/backend/src/tournaments/tournaments.service.ts

Add this private method BEFORE generateBracket (before line 417):

```
  private assignSeeds(
    teams: { id: string; name: string; seed: number | null }[],
  ): { id: string; name: string; seed: number }[] {
    const seeded = teams.filter((t) => t.seed != null) as {
      id: string; name: string; seed: number;
    }[];
    const unseeded = teams.filter((t) => t.seed == null) as {
      id: string; name: string; seed: null;
    }[];
    if (unseeded.length === 0) return seeded;
    // Fisher-Yates shuffle the unseeded teams
    for (let i = unseeded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]];
    }
    // Assign sequential seeds after max existing manual seed
    const maxSeed = seeded.length > 0
      ? Math.max(...seeded.map((t) => t.seed)) : 0;
    let nextSeed = maxSeed + 1;
    const unseededWithSeeds = unseeded.map((t) => ({
      id: t.id, name: t.name, seed: nextSeed++,
    }));
    return [...seeded, ...unseededWithSeeds];
  }
```
