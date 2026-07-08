# Manual Match Management — Tournament System

Admin perlu manage match secara manual dalam turnamen: buat match baru, reassign team, hapus match, reset score, dan regenerate bracket. Saat ini cuma bisa generate bracket otomatis — semua match di-lock ke struktur bracket.

## User Review Required

> [!IMPORTANT]
> **Breaking change pada bracket**: Fitur "Regenerate Bracket" akan menghapus SEMUA match + bracket yang ada lalu bikin ulang. Match yang sudah COMPLETED/scored akan hilang. Apakah ini acceptable, atau perlu konfirmasi tambahan di UI?

> [!WARNING]
> **Reset Match**: Mereset match COMPLETED → SCHEDULED berarti undo winner advancement ke next round. Ini bisa cascade — kalau winner sudah main di round berikutnya, harus di-handle juga.

## Open Questions

1. **Apakah admin perlu buat match di luar bracket?** Misalnya "friendly match" atau "exhibition match" tanpa hubungan ke bracket round. Atau semua match tetap harus di dalam bracket structure?
--Tidak perlu

2. **Delete match — cascade behavior**: Kalau match dihapus yang punya `nextMatch`, apakah next match juga perlu di-reset (clear teamA/teamB slot)?
--Tidak Perlu

3. **Drag-and-drop reorder matches**: Apakah ini perlu, atau cukup manual reassign team via dropdown?

---boleh tambahkan dropdown

## Proposed Changes

### Backend — Match CRUD Endpoints

#### [MODIFY] [tournaments.controller.ts](file:///e:/Vibe/Registrasi Tamu/apps/backend/src/tournaments/tournaments.controller.ts)
Tambah 3 endpoint baru:
- `POST /:id/matches` — Create match manual (specify teamAId, teamBId, roundId optional, court, scheduledAt)
- `DELETE /matches/:matchId` — Delete match (+ cascade clear next match slot)
- `POST /matches/:matchId/reset` — Reset match ke SCHEDULED (clear scores, winner, undo advancement)

#### [MODIFY] [tournaments.service.ts](file:///e:/Vibe/Registrasi Tamu/apps/backend/src/tournaments/tournaments.service.ts)
Implement business logic:
- `createMatch(tournamentId, data)` — Buat match baru dengan matchNumber auto-increment
- `deleteMatch(matchId)` — Delete match, clear next match slot kalau ada, emit SSE
- `resetMatch(matchId)` — Reset score/winner/status, revert advancement di next match, revert team stats
- `regenerateBracket(tournamentId)` — Delete semua bracket+matches lalu re-generate (reuse `BracketEngineService`)

#### [NEW] [create-match.dto.ts](file:///e:/Vibe/Registrasi Tamu/apps/backend/src/tournaments/dto/create-match.dto.ts)
DTO untuk manual match creation:
```typescript
{
  teamAId?: string;
  teamBId?: string;
  roundId?: string;
  court?: string;
  scheduledAt?: string;
}
```

---

### Backend — Bracket Regeneration

#### [MODIFY] [bracket-engine.service.ts](file:///e:/Vibe/Registrasi Tamu/apps/backend/src/tournaments/bracket-engine.service.ts)
- Tambah method `clearBracket(tournamentId)` — Delete semua `Match`, `BracketRound`, `TournamentBracket` terkait, reset team stats
- Hapus check "bracket already exists" dari controller, pindah logika ke service dengan opsi force regenerate

#### [MODIFY] [tournaments.controller.ts](file:///e:/Vibe/Registrasi Tamu/apps/backend/src/tournaments/tournaments.controller.ts)
- Tambah endpoint `POST /:id/regenerate-bracket` — Clear dan re-generate bracket
- Atau modify existing `POST /:id/generate-bracket` accept `{ force: true }` query param

---

### Frontend — Match Management UI

#### [MODIFY] [MatchScoringModal.tsx](file:///e:/Vibe/Registrasi Tamu/apps/frontend/components/tournament/match/MatchScoringModal.tsx)
Enhance modal dengan fitur baru:
- **Reassign Teams**: Dropdown select buat ganti teamA/teamB (pakai teams array yang sudah di-pass)
- **Reset Match**: Button buat reset match COMPLETED → SCHEDULED (dengan confirmation dialog)
- **Delete Match**: Button di danger zone, dengan konfirmasi

#### [NEW] [CreateMatchModal.tsx](file:///e:/Vibe/Registrasi Tamu/apps/frontend/components/tournament/match/CreateMatchModal.tsx)
Modal baru untuk manual match creation:
- Team A dropdown (dari tournament teams)
- Team B dropdown (dari tournament teams) 
- Court input
- Jadwal (datetime-local)
- Round selector (optional, kalau bracket sudah ada)

#### [MODIFY] [page.tsx (tournament detail)](file:///e:/Vibe/Registrasi Tamu/apps/frontend/app/(main)/admin/tournaments/[id]/page.tsx)
Di tab "Matches":
- Tambah button "**+ Add Match**" di header (buka CreateMatchModal)
- Di tab "Brackets":
  - Tambah button "**Regenerate Bracket**" (kalau bracket sudah ada, dengan warning dialog)
  - Visual indicator match mana yang manual vs auto-generated

---

### Frontend — API Client

#### [MODIFY] [tournament-api.ts](file:///e:/Vibe/Registrasi Tamu/apps/frontend/lib/tournament-api.ts)
Tambah methods baru di `matchApi`:
```typescript
async create(tournamentId: string, data: CreateMatchData): Promise<Match>
async delete(matchId: string): Promise<void>
async reset(matchId: string): Promise<Match>
```
Tambah di `bracketApi`:
```typescript
async regenerate(tournamentId: string): Promise<Tournament>
```

#### [MODIFY] [tournament.types.ts](file:///e:/Vibe/Registrasi Tamu/apps/frontend/types/tournament.types.ts)
Tambah `CreateMatchDto` type.

---

## Summary Perubahan

| Area | File | Aksi |
|------|------|------|
| Backend DTO | `create-match.dto.ts` | NEW |
| Backend Controller | `tournaments.controller.ts` | +3 endpoints (create match, delete match, reset match, regenerate bracket) |
| Backend Service | `tournaments.service.ts` | +4 methods (createMatch, deleteMatch, resetMatch, regenerateBracket) |
| Backend Engine | `bracket-engine.service.ts` | +1 method (clearBracket) |
| Frontend Modal | `CreateMatchModal.tsx` | NEW |
| Frontend Modal | `MatchScoringModal.tsx` | +team reassign, +reset, +delete buttons |
| Frontend Page | `[id]/page.tsx` | +Add Match button, +Regenerate Bracket button |
| Frontend API | `tournament-api.ts` | +4 API methods |
| Frontend Types | `tournament.types.ts` | +1 type |

---

## Verification Plan

### Automated Tests
```bash
# Backend build check
cd apps/backend && npx tsc --noEmit

# Frontend build check  
cd apps/frontend && npx next build
```

### Manual Verification
1. Buat turnamen baru → add teams → **create match manual** (tanpa generate bracket)
2. Generate bracket → **reassign team** di match yang SCHEDULED
3. Start match → score → finish → **reset match** → verify score cleared + next match slot cleared
4. **Delete match** → verify cascade clear next match slot
5. Generate bracket → **regenerate bracket** → verify all matches re-created fresh
6. Verify SSE events fire correctly buat semua operasi baru
