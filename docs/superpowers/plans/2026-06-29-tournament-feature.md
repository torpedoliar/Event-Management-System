# Tournament Feature Implementation Plan

> **For agentic workers (MiniMax 2.7, Claude, etc.):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tournament/competition management system with bracket visualization, live match display, and real-time scoring for sports events.

**Architecture:** Modular tournament system that can operate standalone or integrate with existing Event system. Uses bracket engine for tournament generation, SSE for real-time updates, and CSS-based bracket rendering for performance.

**Tech Stack:** Next.js 15 (frontend), NestJS 10 (backend), PostgreSQL (database), Prisma (ORM), Server-Sent Events (real-time), React Query (state management), Lucide React (icons)

**Design Spec:** `docs/superpowers/specs/2026-06-29-tournament-feature-design.md`

## Global Constraints

- Follow existing codebase patterns (Lucky Draw module for backend, Guest import for CSV handling)
- Use TypeScript strict mode for all new code
- WCAG AA accessibility compliance for all UI
- Dark mode support for public display pages
- Mobile-first responsive design (375px → 1920px+)
- No emoji as icons (use Lucide React only)
- Reuse existing SSE infrastructure (`useSSE` hook)
- Reuse existing file upload infrastructure for team logos

---

## Skill Binding Guide

**MANDATORY:** Before starting each task, invoke the specified skills. These skills provide critical context and prevent AI-generated slop.

| Task Type | Required Skills | When to Invoke |
|-----------|----------------|----------------|
| **UI/UX Design & Styling** | `ui-ux-pro-max:ui-ux-pro-max` + `taste-skill:taste-skill` | Before writing ANY component CSS or layout code |
| **Backend Logic** | `superpowers:test-driven-development` | Before writing backend services or bracket engine |
| **Frontend Components** | `superpowers:test-driven-development` + UI/UX skills above | Before writing React components |
| **API Endpoints** | `superpowers:test-driven-development` | Before writing controllers or DTOs |
| **Testing** | `superpowers:test-driven-development` | Before writing any test files |

**How to invoke:**
```
# Example: Before writing BracketView component
1. Run: Skill("ui-ux-pro-max:ui-ux-pro-max") with args: "tournament bracket viewer sports"
2. Run: Skill("taste-skill:taste-skill") with args: "sports tournament bracket display"
3. Apply design system recommendations from output
4. Then write component code following those guidelines
```

---

## File Structure

### Backend Files (Phase 1-3)

```
apps/backend/src/
├── tournaments/
│   ├── tournaments.module.ts                    # NestJS module definition
│   ├── tournaments.controller.ts                # REST API endpoints
│   ├── tournaments.service.ts                   # Business logic (CRUD)
│   ├── bracket-engine.service.ts                # Bracket generation & updates
│   ├── match-scoring.service.ts                 # Score input & winner logic
│   ├── dto/
│   │   ├── create-tournament.dto.ts             # Validation for POST
│   │   ├── update-tournament.dto.ts             # Validation for PATCH
│   │   ├── create-team.dto.ts                   # Team registration
│   │   ├── update-score.dto.ts                  # Score input
│   │   └── import-teams.dto.ts                  # CSV import
│   └── types/
│       └── tournament.types.ts                  # Enums & interfaces
└── prisma/
    └── schema.prisma                            # Add Tournament models (MODIFY)

apps/backend/test/
└── tournaments/
    ├── bracket-engine.spec.ts                   # Bracket generation tests
    └── match-scoring.spec.ts                    # Scoring logic tests
```

### Frontend Files (Phase 1-3)

```
apps/frontend/app/(main)/
├── admin/tournaments/
│   ├── page.tsx                                 # Tournament list
│   ├── new/page.tsx                             # Create form
│   └── [id]/
│       ├── page.tsx                             # Detail (tabs)
│       ├── edit/page.tsx                        # Edit form
│       └── matches/
│           ├── page.tsx                         # Match list
│           └── [matchId]/page.tsx               # Score input
└── tournament/
    ├── bracket/[id]/page.tsx                    # Public bracket viewer
    └── live/[matchId]/page.tsx                  # Live match display

apps/frontend/components/tournament/
├── bracket/
│   ├── BracketView.tsx                          # Full bracket tree
│   ├── BracketMatchBox.tsx                      # Single match box
│   └── BracketConnector.tsx                     # Connector lines
├── match/
│   ├── LiveMatchDisplay.tsx                     # Full-screen live score
│   ├── MatchCard.tsx                            # Match summary
│   ├── MatchTimer.tsx                           # Live timer
│   └── ScoreInput.tsx                           # Admin score form
├── team/
│   ├── TeamCard.tsx                             # Team card
│   ├── TeamLogo.tsx                             # Logo or initial
│   └── TeamMemberList.tsx                       # Members table
├── TournamentTabs.tsx                           # Tab navigation
├── TournamentForm.tsx                           # Create/edit form
└── StatusPill.tsx                               # Status badge

apps/frontend/hooks/
└── useTournamentSSE.ts                          # SSE subscription hook

apps/frontend/types/
└── tournament.types.ts                          # TypeScript types
```

---

## Phase 1: Core Tournament + Bracket (MVP)

### Task 1.1: Database Schema & Prisma Models

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/YYYYMMDD_add_tournament_models/migration.sql` (auto-generated)

**Interfaces:**
- Consumes: Nothing
- Produces: Prisma client with Tournament, TournamentTeam, TeamMember, Match, TournamentBracket, BracketRound models

- [ ] **Step 1: Add enums to schema.prisma**

```prisma
enum SportType {
  FUTSAL
  BASKET
  VOLLEY
  BADMINTON
  CHESS
  ESPORTS
  OTHER
}

enum TournamentFormat {
  SINGLE_ELIM
  DOUBLE_ELIM
  ROUND_ROBIN
  SWISS
  GROUP_KNOCKOUT
}

enum ParticipantType {
  TEAM
  INDIVIDUAL
}

enum ScoringMode {
  SIMPLE
  SETS
  POINTS
}

enum SchedulingMode {
  MANUAL
  AUTO
}

enum TournamentStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum MatchStatus {
  SCHEDULED
  ONGOING
  COMPLETED
  CANCELLED
  WALKOVER
}
```

- [ ] **Step 2: Add Tournament model**

```prisma
model Tournament {
  id                String              @id @default(uuid())
  name              String              @db.VarChar(100)
  sportType         SportType
  formatType        TournamentFormat
  participantType   ParticipantType
  scoringMode       ScoringMode         @default(SIMPLE)
  scoringConfig     Json?
  schedulingMode    SchedulingMode      @default(MANUAL)
  courtCount        Int                 @default(1)
  status            TournamentStatus    @default(DRAFT)
  startDate         DateTime?
  endDate           DateTime?
  eventId           String?
  event             Event?              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  teams             TournamentTeam[]
  matches           Match[]
  brackets          TournamentBracket[]
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([eventId])
  @@index([status])
}
```

- [ ] **Step 3: Add TournamentTeam model**

```prisma
model TournamentTeam {
  id              String        @id @default(uuid())
  tournamentId    String
  tournament      Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  name            String        @db.VarChar(100)
  logoUrl         String?
  seed            Int?
  isEliminated    Boolean       @default(false)
  wins            Int           @default(0)
  losses          Int           @default(0)
  draws           Int           @default(0)
  
  members         TeamMember[]
  matchesAsA      Match[]       @relation("TeamA")
  matchesAsB      Match[]       @relation("TeamB")
  matchesWon      Match[]       @relation("Winner")
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([tournamentId])
  @@index([tournamentId, seed])
}
```

- [ ] **Step 4: Add TeamMember model**

```prisma
model TeamMember {
  id              String          @id @default(uuid())
  teamId          String
  team            TournamentTeam  @relation(fields: [teamId], references: [id], onDelete: Cascade)
  name            String          @db.VarChar(100)
  photoUrl        String?
  jerseyNumber    String?         @db.VarChar(10)
  guestId         String?
  guest           Guest?          @relation(fields: [guestId], references: [id], onDelete: SetNull)
  role            String?         @db.VarChar(50)
  
  matchParticipations MatchParticipant[]
  
  createdAt       DateTime        @default(now())

  @@index([teamId])
  @@index([guestId])
}
```

- [ ] **Step 5: Add Match model**

```prisma
model Match {
  id              String          @id @default(uuid())
  tournamentId    String
  tournament      Tournament      @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  roundId         String?
  round           BracketRound?   @relation(fields: [roundId], references: [id], onDelete: SetNull)
  matchNumber     Int
  teamAId         String?
  teamA           TournamentTeam? @relation("TeamA", fields: [teamAId], references: [id], onDelete: SetNull)
  teamBId         String?
  teamB           TournamentTeam? @relation("TeamB", fields: [teamBId], references: [id], onDelete: SetNull)
  scoreA          Int?
  scoreB          Int?
  setsA           Int?
  setsB           Int?
  winnerId        String?
  winner          TournamentTeam? @relation("Winner", fields: [winnerId], references: [id], onDelete: SetNull)
  status          MatchStatus     @default(SCHEDULED)
  scheduledAt     DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  court           String?         @db.VarChar(50)
  nextMatchId     String?
  nextMatch       Match?          @relation("NextMatch", fields: [nextMatchId], references: [id])
  nextMatchSlot   String?         @db.VarChar(1)
  
  sets            MatchSet[]
  participants    MatchParticipant[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([tournamentId])
  @@index([tournamentId, status])
  @@index([roundId])
  @@index([nextMatchId])
}
```

- [ ] **Step 6: Add supporting models (MatchSet, MatchParticipant, TournamentBracket, BracketRound)**

```prisma
model MatchSet {
  id              String    @id @default(uuid())
  matchId         String
  match           Match     @relation(fields: [matchId], references: [id], onDelete: Cascade)
  setNumber       Int
  scoreA          Int
  scoreB          Int
  
  createdAt       DateTime  @default(now())

  @@index([matchId])
  @@unique([matchId, setNumber])
}

model MatchParticipant {
  id              String      @id @default(uuid())
  matchId         String
  match           Match       @relation(fields: [matchId], references: [id], onDelete: Cascade)
  teamId          String
  memberId        String
  member          TeamMember  @relation(fields: [memberId], references: [id], onDelete: Cascade)
  isStarter       Boolean     @default(true)
  
  createdAt       DateTime    @default(now())

  @@index([matchId])
  @@index([teamId])
  @@index([memberId])
}

model TournamentBracket {
  id              String        @id @default(uuid())
  tournamentId    String
  tournament      Tournament    @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  type            String        @default("WINNER") @db.VarChar(20)
  
  rounds          BracketRound[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([tournamentId])
  @@unique([tournamentId, type])
}

model BracketRound {
  id              String            @id @default(uuid())
  bracketId       String
  bracket         TournamentBracket @relation(fields: [bracketId], references: [id], onDelete: Cascade)
  roundNumber     Int
  name            String?           @db.VarChar(50)
  
  matches         Match[]
  
  createdAt       DateTime          @default(now())

  @@index([bracketId])
  @@unique([bracketId, roundNumber])
}
```

- [ ] **Step 7: Add enableTournament field to Event model**

```prisma
model Event {
  // ... existing fields ...
  enableTournament    Boolean       @default(false)
  
  // Add relation
  tournaments         Tournament[]
}
```

- [ ] **Step 8: Add relation to Guest model**

```prisma
model Guest {
  // ... existing fields ...
  teamMemberships TeamMember[]
}
```

- [ ] **Step 9: Run Prisma migration**

```bash
cd apps/backend
npx prisma migrate dev --name add_tournament_models
npx prisma generate
```

Expected: Migration file created, Prisma client regenerated

- [ ] **Step 10: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(tournament): add database schema for tournament models

- Tournament, TournamentTeam, TeamMember, Match models
- Supporting models: MatchSet, MatchParticipant, TournamentBracket, BracketRound
- Enums: SportType, TournamentFormat, ParticipantType, ScoringMode, MatchStatus
- Add enableTournament field to Event model
- Relations to Guest model for multi-level participation"
```

---

### Task 1.2: Backend Module Setup & DTOs

**Files:**
- Create: `apps/backend/src/tournaments/tournaments.module.ts`
- Create: `apps/backend/src/tournaments/dto/create-tournament.dto.ts`
- Create: `apps/backend/src/tournaments/dto/update-tournament.dto.ts`
- Create: `apps/backend/src/tournaments/dto/create-team.dto.ts`
- Create: `apps/backend/src/tournaments/types/tournament.types.ts`
- Modify: `apps/backend/src/app.module.ts` (import TournamentsModule)

**Interfaces:**
- Consumes: Prisma client from Task 1.1
- Produces: TournamentsModule, DTOs for validation

**SKILL BINDING:** Before writing DTOs, invoke `superpowers:test-driven-development` to understand validation patterns.

- [ ] **Step 1: Create tournament.types.ts**

```typescript
// apps/backend/src/tournaments/types/tournament.types.ts

export enum SportType {
  FUTSAL = 'FUTSAL',
  BASKET = 'BASKET',
  VOLLEY = 'VOLLEY',
  BADMINTON = 'BADMINTON',
  CHESS = 'CHESS',
  ESPORTS = 'ESPORTS',
  OTHER = 'OTHER',
}

export enum TournamentFormat {
  SINGLE_ELIM = 'SINGLE_ELIM',
  DOUBLE_ELIM = 'DOUBLE_ELIM',
  ROUND_ROBIN = 'ROUND_ROBIN',
  SWISS = 'SWISS',
  GROUP_KNOCKOUT = 'GROUP_KNOCKOUT',
}

export enum ParticipantType {
  TEAM = 'TEAM',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum ScoringMode {
  SIMPLE = 'SIMPLE',
  SETS = 'SETS',
  POINTS = 'POINTS',
}

export enum SchedulingMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  WALKOVER = 'WALKOVER',
}

export interface ScoringConfig {
  maxSets?: number;
  targetPoints?: number;
}
```

- [ ] **Step 2: Create create-tournament.dto.ts**

```typescript
// apps/backend/src/tournaments/dto/create-tournament.dto.ts

import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SportType,
  TournamentFormat,
  ParticipantType,
  ScoringMode,
  SchedulingMode,
  ScoringConfig,
} from '../types/tournament.types';

export class CreateTournamentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(SportType)
  sportType: SportType;

  @IsEnum(TournamentFormat)
  formatType: TournamentFormat;

  @IsEnum(ParticipantType)
  participantType: ParticipantType;

  @IsEnum(ScoringMode)
  @IsOptional()
  scoringMode?: ScoringMode;

  @IsObject()
  @IsOptional()
  scoringConfig?: ScoringConfig;

  @IsEnum(SchedulingMode)
  @IsOptional()
  schedulingMode?: SchedulingMode;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  courtCount?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  eventId?: string;
}
```

- [ ] **Step 3: Create update-tournament.dto.ts**

```typescript
// apps/backend/src/tournaments/dto/update-tournament.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTournamentDto } from './create-tournament.dto';
import { TournamentStatus } from '../types/tournament.types';

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;
}
```

- [ ] **Step 4: Create create-team.dto.ts**

```typescript
// apps/backend/src/tournaments/dto/create-team.dto.ts

import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTeamMemberDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  jerseyNumber?: string;

  @IsString()
  @IsOptional()
  guestId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  role?: string;
}

export class CreateTeamDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  seed?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeamMemberDto)
  @IsOptional()
  members?: CreateTeamMemberDto[];
}
```

- [ ] **Step 5: Create tournaments.module.ts**

```typescript
// apps/backend/src/tournaments/tournaments.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [],
  controllers: [],
  exports: [],
})
export class TournamentsModule {}
```

- [ ] **Step 6: Import TournamentsModule in app.module.ts**

```typescript
// apps/backend/src/app.module.ts

import { Module } from '@nestjs/common';
// ... existing imports ...
import { TournamentsModule } from './tournaments/tournaments.module';

@Module({
  imports: [
    // ... existing modules ...
    TournamentsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Verify module loads**

```bash
cd apps/backend
npm run build
```

Expected: Build succeeds, no errors

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/tournaments/
git commit -m "feat(tournament): add module setup and DTOs

- Create TournamentsModule with PrismaModule dependency
- CreateTournamentDto with validation (name, sport, format, scoring)
- UpdateTournamentDto with status field
- CreateTeamDto with nested members validation
- Type definitions for enums and interfaces"
```

---

### Task 1.3: Bracket Engine Service (TDD)

**Files:**
- Create: `apps/backend/src/tournaments/bracket-engine.service.ts`
- Create: `apps/backend/test/tournaments/bracket-engine.spec.ts`
- Modify: `apps/backend/src/tournaments/tournaments.module.ts` (add provider)

**Interfaces:**
- Consumes: Prisma client, TournamentTeam[]
- Produces: Match[] with nextMatchId and nextMatchSlot set

**SKILL BINDING:** Before writing tests, invoke `superpowers:test-driven-development` to understand TDD workflow.

- [ ] **Step 1: Write failing test for 8-team single elimination**

```typescript
// apps/backend/test/tournaments/bracket-engine.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BracketEngineService } from '../../src/tournaments/bracket-engine.service';

describe('BracketEngineService', () => {
  let service: BracketEngineService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [BracketEngineService],
    }).compile();

    service = module.get<BracketEngineService>(BracketEngineService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateSingleElimination', () => {
    it('should generate 7 matches for 8 teams', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      expect(matches).toHaveLength(7);
    });

    it('should create 3 rounds (QF, SF, F)', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      const round1Matches = matches.filter((m) => m.matchNumber <= 4);
      const round2Matches = matches.filter(
        (m) => m.matchNumber > 4 && m.matchNumber <= 6,
      );
      const finalMatches = matches.filter((m) => m.matchNumber === 7);

      expect(round1Matches).toHaveLength(4);
      expect(round2Matches).toHaveLength(2);
      expect(finalMatches).toHaveLength(1);
    });

    it('should seed teams correctly (1 vs 8, 2 vs 7, etc.)', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      const firstMatch = matches[0];
      expect(firstMatch.teamAId).toBe('team-1');
      expect(firstMatch.teamBId).toBe('team-8');
    });

    it('should set nextMatchId for winner advancement', async () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const matches = await service.generateSingleElimination(
        'tournament-1',
        teams,
      );

      const match1 = matches[0];
      const match2 = matches[1];
      const match5 = matches[4]; // First SF match

      expect(match1.nextMatchId).toBe(match5.id);
      expect(match1.nextMatchSlot).toBe('A');
      expect(match2.nextMatchId).toBe(match5.id);
      expect(match2.nextMatchSlot).toBe('B');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend
npm run test test/tournaments/bracket-engine.spec.ts
```

Expected: FAIL - BracketEngineService not found

- [ ] **Step 3: Implement BracketEngineService**

```typescript
// apps/backend/src/tournaments/bracket-engine.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from './types/tournament.types';

interface TeamSeed {
  id: string;
  name: string;
  seed: number;
}

interface GeneratedMatch {
  id: string;
  tournamentId: string;
  roundId: string;
  matchNumber: number;
  teamAId?: string;
  teamBId?: string;
  status: MatchStatus;
  nextMatchId?: string;
  nextMatchSlot?: string;
}

@Injectable()
export class BracketEngineService {
  constructor(private prisma: PrismaService) {}

  async generateSingleElimination(
    tournamentId: string,
    teams: TeamSeed[],
  ): Promise<GeneratedMatch[]> {
    if (teams.length < 2) {
      throw new Error('Minimum 2 teams required');
    }

    // Round up to next power of 2
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, numRounds);

    // Sort teams by seed
    const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);

    // Create bracket
    const bracket = await this.prisma.tournamentBracket.create({
      data: {
        tournamentId,
        type: 'WINNER',
      },
    });

    // Create rounds
    const rounds = [];
    for (let i = 1; i <= numRounds; i++) {
      const roundName = this.getRoundName(i, numRounds);
      const round = await this.prisma.bracketRound.create({
        data: {
          bracketId: bracket.id,
          roundNumber: i,
          name: roundName,
        },
      });
      rounds.push(round);
    }

    // Generate matches
    const matches: GeneratedMatch[] = [];
    let matchNumber = 1;

    // First round: pair teams
    const firstRoundMatches = bracketSize / 2;
    for (let i = 0; i < firstRoundMatches; i++) {
      const teamA = sortedTeams[i];
      const teamB = sortedTeams[bracketSize - 1 - i];

      const match: GeneratedMatch = {
        id: `match-${matchNumber}`,
        tournamentId,
        roundId: rounds[0].id,
        matchNumber,
        teamAId: teamA?.id,
        teamBId: teamB?.id,
        status: MatchStatus.SCHEDULED,
      };

      matches.push(match);
      matchNumber++;
    }

    // Subsequent rounds: create placeholder matches
    for (let round = 1; round < numRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round + 1);
      for (let i = 0; i < matchesInRound; i++) {
        const match: GeneratedMatch = {
          id: `match-${matchNumber}`,
          tournamentId,
          roundId: rounds[round].id,
          matchNumber,
          status: MatchStatus.SCHEDULED,
        };

        matches.push(match);
        matchNumber++;
      }
    }

    // Set nextMatchId and nextMatchSlot
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const roundIndex = rounds.findIndex((r) => r.id === match.roundId);

      if (roundIndex < numRounds - 1) {
        // Not the final
        const nextRoundStartIndex = matches.findIndex(
          (m) => m.roundId === rounds[roundIndex + 1].id,
        );
        const matchesInCurrentRound = matches.filter(
          (m) => m.roundId === match.roundId,
        ).length;
        const matchIndexInRound = matchesInCurrentRound.indexOf(match);
        const nextMatchIndex =
          nextRoundStartIndex + Math.floor(matchIndexInRound / 2);
        const nextMatch = matches[nextMatchIndex];

        if (nextMatch) {
          match.nextMatchId = nextMatch.id;
          match.nextMatchSlot = matchIndexInRound % 2 === 0 ? 'A' : 'B';
        }
      }
    }

    // Save to database
    const savedMatches = await Promise.all(
      matches.map((m) =>
        this.prisma.match.create({
          data: {
            tournamentId: m.tournamentId,
            roundId: m.roundId,
            matchNumber: m.matchNumber,
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            status: m.status,
            nextMatchId: m.nextMatchId,
            nextMatchSlot: m.nextMatchSlot,
          },
        }),
      ),
    );

    return savedMatches;
  }

  private getRoundName(roundNumber: number, totalRounds: number): string {
    const matchesInRound = Math.pow(2, totalRounds - roundNumber);

    if (roundNumber === totalRounds) return 'Final';
    if (roundNumber === totalRounds - 1) return 'Semi-Final';
    if (roundNumber === totalRounds - 2) return 'Quarter-Final';
    return `Round of ${matchesInRound * 2}`;
  }
}
```

- [ ] **Step 4: Add BracketEngineService to module**

```typescript
// apps/backend/src/tournaments/tournaments.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BracketEngineService } from './bracket-engine.service';

@Module({
  imports: [PrismaModule],
  providers: [BracketEngineService],
  controllers: [],
  exports: [BracketEngineService],
})
export class TournamentsModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/backend
npm run test test/tournaments/bracket-engine.spec.ts
```

Expected: All tests PASS

- [ ] **Step 6: Add test for 10-team bracket (with byes)**

```typescript
// Add to apps/backend/test/tournaments/bracket-engine.spec.ts

describe('generateSingleElimination with byes', () => {
  it('should generate 9 matches for 10 teams (16-team bracket with 6 byes)', async () => {
    const teams = Array.from({ length: 10 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      seed: i + 1,
    }));

    const matches = await service.generateSingleElimination(
      'tournament-2',
      teams,
    );

    expect(matches).toHaveLength(15); // 16-team bracket = 15 matches
  });

  it('should give top seeds byes in first round', async () => {
    const teams = Array.from({ length: 10 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      seed: i + 1,
    }));

    const matches = await service.generateSingleElimination(
      'tournament-2',
      teams,
    );

    const firstRoundMatches = matches.filter(
      (m) => m.roundId === matches[0].roundId,
    );
    const matchesWithByes = firstRoundMatches.filter(
      (m) => !m.teamAId || !m.teamBId,
    );

    expect(matchesWithByes).toHaveLength(6); // 16 - 10 = 6 byes
  });
});
```

- [ ] **Step 7: Run tests**

```bash
cd apps/backend
npm run test test/tournaments/bracket-engine.spec.ts
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/tournaments/bracket-engine.service.ts
git add apps/backend/test/tournaments/bracket-engine.spec.ts
git add apps/backend/src/tournaments/tournaments.module.ts
git commit -m "feat(tournament): implement bracket engine with TDD

- generateSingleElimination for power-of-2 team counts
- Automatic seeding (1 vs 16, 2 vs 15, etc.)
- nextMatchId and nextMatchSlot for winner advancement
- Bye handling for non-power-of-2 team counts
- Round naming (Final, Semi-Final, Quarter-Final, Round of N)
- Comprehensive test coverage (8 teams, 10 teams with byes)"
```

---

---

## MiniMax 2.7 Compatibility Guide

**For MiniMax 2.7 Agent:** This plan is designed to work with MiniMax 2.7 (or any other AI coding agent). Follow these guidelines:

### Skill Invocation Pattern

MiniMax 2.7 should invoke skills using the standard Skill tool. Before each task, check the **SKILL BINDING** section and invoke the required skills.

**Example for UI/UX task:**
```
1. Call: Skill(skill: "ui-ux-pro-max:ui-ux-pro-max", args: "tournament bracket sports dashboard")
2. Call: Skill(skill: "taste-skill:taste-skill", args: "sports tournament bracket display")
3. Read the design system output carefully
4. Apply the color palette, typography, and spacing recommendations
5. Write component code following those exact specifications
```

**Example for Backend TDD task:**
```
1. Call: Skill(skill: "superpowers:test-driven-development")
2. Follow the TDD workflow: Write test → Run test (expect fail) → Write minimal code → Run test (expect pass) → Refactor → Commit
3. Each step is a separate checkbox in the task
```

### Context Management

MiniMax 2.7 has limited context window. To avoid context overflow:

1. **Work one task at a time** - Complete Task 1.1 fully before moving to 1.2
2. **Commit frequently** - After each task, commit and start fresh context for next task
3. **Reference spec by path** - When you need design details, read `docs/superpowers/specs/2026-06-29-tournament-feature-design.md` instead of keeping it in memory
4. **Use exact file paths** - The plan provides exact paths, use them directly

### Code Quality Checklist (Run Before Each Commit)

Before committing each task, MiniMax 2.7 should verify:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Tests pass (`npm run test`)
- [ ] No linting errors (`npm run lint`)
- [ ] UI components are responsive (test at 375px, 768px, 1024px, 1920px)
- [ ] Dark mode works for public pages
- [ ] No emoji used as icons (use Lucide React only)
- [ ] All API endpoints have proper validation
- [ ] SSE events emit correct payloads

### Error Recovery

If MiniMax 2.7 encounters an error:

1. **Build fails** - Check for missing imports, type errors, or syntax errors
2. **Tests fail** - Re-read the test, understand what it expects, fix implementation
3. **Runtime error** - Check logs, verify database migrations ran, check environment variables
4. **Skill invocation fails** - Continue without skill, but manually apply design principles from spec

### Task Completion Criteria

A task is **complete** when:

- [ ] All checkboxes in the task are marked `[x]`
- [ ] Code is committed with the specified commit message
- [ ] No build/test/lint errors
- [ ] Next task can start without issues

**Do NOT skip steps** - Each step is intentionally small (2-5 minutes) to prevent errors.

---

---

## Phase 2: Match & Scoring

### Task 2.1: Match Scoring Service (TDD)

**Files:**
- Create: `apps/backend/src/tournaments/match-scoring.service.ts`
- Create: `apps/backend/src/tournaments/dto/update-score.dto.ts`
- Create: `apps/backend/test/tournaments/match-scoring.spec.ts`
- Modify: `apps/backend/src/tournaments/tournaments.module.ts` (add provider)

**Interfaces:**
- Consumes: Prisma client, Match, TournamentTeam
- Produces: Updated Match with winner, emits SSE events

**SKILL BINDING:** Before writing tests, invoke `superpowers:test-driven-development`.

- [ ] **Step 1: Create update-score.dto.ts**

```typescript
// apps/backend/src/tournaments/dto/update-score.dto.ts

import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateScoreDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  scoreA: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  scoreB: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  setsA?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  setsB?: number;
}
```

- [ ] **Step 2: Write failing test for simple scoring**

```typescript
// apps/backend/test/tournaments/match-scoring.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { MatchScoringService } from '../../src/tournaments/match-scoring.service';
import { MatchStatus } from '../../src/tournaments/types/tournament.types';

describe('MatchScoringService', () => {
  let service: MatchScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [MatchScoringService],
    }).compile();

    service = module.get<MatchScoringService>(MatchScoringService);
  });

  describe('updateScore - SIMPLE mode', () => {
    it('should determine winner when scoreA > scoreB', async () => {
      const match = {
        id: 'match-1',
        tournamentId: 'tournament-1',
        teamAId: 'team-a',
        teamBId: 'team-b',
        status: MatchStatus.ONGOING,
        nextMatchId: 'match-5',
        nextMatchSlot: 'A',
      };

      const result = await service.updateScore(match.id, {
        scoreA: 12,
        scoreB: 10,
      });

      expect(result.winnerId).toBe('team-a');
      expect(result.status).toBe(MatchStatus.COMPLETED);
    });

    it('should determine winner when scoreB > scoreA', async () => {
      const match = {
        id: 'match-1',
        tournamentId: 'tournament-1',
        teamAId: 'team-a',
        teamBId: 'team-b',
        status: MatchStatus.ONGOING,
        nextMatchId: 'match-5',
        nextMatchSlot: 'A',
      };

      const result = await service.updateScore(match.id, {
        scoreA: 8,
        scoreB: 15,
      });

      expect(result.winnerId).toBe('team-b');
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/backend
npm run test test/tournaments/match-scoring.spec.ts
```

Expected: FAIL - MatchScoringService not found

- [ ] **Step 4: Implement MatchScoringService**

```typescript
// apps/backend/src/tournaments/match-scoring.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from './types/tournament.types';

@Injectable()
export class MatchScoringService {
  constructor(private prisma: PrismaService) {}

  async updateScore(
    matchId: string,
    scores: { scoreA: number; scoreB: number; setsA?: number; setsB?: number },
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { tournament: true },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    // Determine winner
    let winnerId: string | null = null;
    if (scores.scoreA > scores.scoreB) {
      winnerId = match.teamAId;
    } else if (scores.scoreB > scores.scoreA) {
      winnerId = match.teamBId;
    }

    // Update match
    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        scoreA: scores.scoreA,
        scoreB: scores.scoreB,
        setsA: scores.setsA,
        setsB: scores.setsB,
        winnerId,
        status: winnerId ? MatchStatus.COMPLETED : MatchStatus.ONGOING,
        completedAt: winnerId ? new Date() : null,
      },
    });

    // Advance winner to next match
    if (winnerId && match.nextMatchId && match.nextMatchSlot) {
      await this.advanceWinner(match.nextMatchId, match.nextMatchSlot, winnerId);
    }

    // Update team stats
    if (winnerId) {
      await this.updateTeamStats(match.teamAId!, match.teamBId!, winnerId);
    }

    return updatedMatch;
  }

  private async advanceWinner(
    nextMatchId: string,
    slot: string,
    winnerId: string,
  ) {
    const updateData = slot === 'A' ? { teamAId: winnerId } : { teamBId: winnerId };

    await this.prisma.match.update({
      where: { id: nextMatchId },
      data: updateData,
    });
  }

  private async updateTeamStats(
    teamAId: string,
    teamBId: string,
    winnerId: string,
  ) {
    // Update winner
    await this.prisma.tournamentTeam.update({
      where: { id: winnerId },
      data: { wins: { increment: 1 } },
    });

    // Update loser
    const loserId = winnerId === teamAId ? teamBId : teamAId;
    await this.prisma.tournamentTeam.update({
      where: { id: loserId },
      data: { losses: { increment: 1 }, isEliminated: true },
    });
  }
}
```

- [ ] **Step 5: Add MatchScoringService to module**

```typescript
// apps/backend/src/tournaments/tournaments.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BracketEngineService } from './bracket-engine.service';
import { MatchScoringService } from './match-scoring.service';

@Module({
  imports: [PrismaModule],
  providers: [BracketEngineService, MatchScoringService],
  controllers: [],
  exports: [BracketEngineService, MatchScoringService],
})
export class TournamentsModule {}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd apps/backend
npm run test test/tournaments/match-scoring.spec.ts
```

Expected: All tests PASS

- [ ] **Step 7: Add test for SETS mode**

```typescript
// Add to apps/backend/test/tournaments/match-scoring.spec.ts

describe('updateScore - SETS mode', () => {
  it('should determine winner based on sets won (best of 3)', async () => {
    const match = {
      id: 'match-1',
      tournamentId: 'tournament-1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      status: MatchStatus.ONGOING,
      nextMatchId: 'match-5',
      nextMatchSlot: 'A',
    };

    const result = await service.updateScore(match.id, {
      scoreA: 21,
      scoreB: 19,
      setsA: 2,
      setsB: 1,
    });

    expect(result.winnerId).toBe('team-a');
    expect(result.setsA).toBe(2);
    expect(result.setsB).toBe(1);
  });
});
```

- [ ] **Step 8: Run tests**

```bash
cd apps/backend
npm run test test/tournaments/match-scoring.spec.ts
```

Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/tournaments/match-scoring.service.ts
git add apps/backend/src/tournaments/dto/update-score.dto.ts
git add apps/backend/test/tournaments/match-scoring.spec.ts
git add apps/backend/src/tournaments/tournaments.module.ts
git commit -m "feat(tournament): implement match scoring service with TDD

- updateScore for SIMPLE and SETS modes
- Automatic winner determination
- Winner advancement to next match
- Team stats update (wins, losses, isEliminated)
- Comprehensive test coverage"
```

---

**[Tasks 2.2-2.8: Backend API, SSE integration, Frontend components - follow same TDD pattern]**

---

## Phase 3: Public Display & Live Match

### Task 3.1: Public Bracket Viewer Page

**Files:**
- Create: `apps/frontend/app/(main)/tournament/bracket/[id]/page.tsx`
- Create: `apps/frontend/components/tournament/bracket/BracketView.tsx`
- Create: `apps/frontend/components/tournament/bracket/BracketMatchBox.tsx`

**SKILL BINDING:** Before writing components, invoke:
1. `ui-ux-pro-max:ui-ux-pro-max` with args: "tournament bracket viewer sports"
2. `taste-skill:taste-skill` with args: "sports tournament bracket display"

Apply design system: Dark background, high-contrast team names, connector lines with accent color.

**[Tasks 3.1-3.5: Public pages, fullscreen mode, responsive design - follow same pattern with UI/UX skills]**

---

## Summary

**Complete Implementation Plan for Tournament Feature**

### Phases Overview

| Phase | Tasks | Duration | Focus |
|-------|-------|----------|-------|
| **Phase 1** | 1.1-1.3 (shown) | 3-4 days | Database, bracket engine, basic CRUD |
| **Phase 2** | 2.1-2.8 | 2-3 days | Match scoring, SSE, admin UI |
| **Phase 3** | 3.1-3.5 | 1-2 days | Public display, fullscreen, responsive |

**Total:** ~25-30 tasks, 6-9 days focused work

### Skill Binding Matrix

| Task Type | Primary Skills | Secondary Skills |
|-----------|---------------|------------------|
| Database Schema | None | - |
| Backend Services | `superpowers:test-driven-development` | - |
| API Endpoints | `superpowers:test-driven-development` | - |
| Frontend Components | `ui-ux-pro-max` + `taste-skill` | `superpowers:test-driven-development` |
| Styling/CSS | `ui-ux-pro-max` + `taste-skill` | - |
| Testing | `superpowers:test-driven-development` | - |

### MiniMax 2.7 Quick Start

1. Read this plan: `docs/superpowers/plans/2026-06-29-tournament-feature.md`
2. Read design spec: `docs/superpowers/specs/2026-06-29-tournament-feature-design.md`
3. Start with Task 1.1 (Database Schema)
4. For each task:
   - Check **SKILL BINDING** section
   - Invoke required skills
   - Complete all checkboxes
   - Commit with specified message
   - Move to next task

### Execution Approaches

**Option 1: Subagent-Driven (Recommended)**
- Dispatch fresh subagent per task
- Review between tasks
- Fast iteration, clean context

**Option 2: Inline Execution**
- Execute tasks in current session
- Batch execution with checkpoints
- Good for quick tasks

---

**End of Implementation Plan**
