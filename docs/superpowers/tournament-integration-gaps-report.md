# Integrasi Tournament ke Core Event Management — Catatan Temuan

**Tanggal:** 2026-07-07  
**Status:** Draft Review  
**Tujuan:** Dokumentasi gap antara implementasi tournament saat ini dengan rencana integrasi ke core aplikasi

---

## 📌 Referensi

- **Design Spec:** `docs/superpowers/specs/2026-06-29-tournament-feature-design.md`
- **Implementation Plan:** `docs/superpowers/plans/2026-06-29-tournament-feature.md`
- **Source Code:** `apps/backend/src/tournaments/`, `apps/frontend/app/(main)/admin/tournaments/`, `apps/frontend/components/tournament/`

---

## ✅ Bagian yang SUDAH Terimplementasi Sesuai Spec

### Backend
| Item | File | Keterangan |
|------|------|------------|
| Module `TournamentsModule` | `tournaments.module.ts` | Terdaftar di `app.module.ts` |
| Controller REST API | `tournaments.controller.ts` | CRUD, Teams, Matches, Bracket, Stats |
| Service logic | `tournaments.service.ts` | Create/find/update/delete + team & match mgmt |
| Bracket Engine | `bracket-engine.service.ts` | Generate single elimination bracket |
| Match Scoring | `match-scoring.service.ts` | Score input, winner determination, advance winner |
| DTOs validasi | `dto/*.ts` | `CreateTournamentDto`, `CreateTeamDto`, `ImportTeamsDto`, dll |
| Enum types | `types/tournament.types.ts` | SportType, TournamentFormat, dll |
| Database schema | `prisma/schema.prisma` | Tournament, TournamentTeam, TeamMember, Match, dll |

### Frontend
| Item | Keterangan |
|------|------------|
| List Tournament | `admin/tournaments/page.tsx` — modal create, search, filter |
| Create Tournament | `admin/tournaments/new/page.tsx` — halaman dedicated create |
| Detail Tournament | `admin/tournaments/[id]/page.tsx` — 5 tabs: overview, teams, matches, brackets, settings |
| Edit Tournament | `admin/tournaments/[id]/edit/page.tsx` |
| Komponen2 Tournament | `TournamentForm.tsx`, `TeamFormModal.tsx`, `TeamMemberFormModal.tsx`, `BracketView.tsx`, `MatchScoringModal.tsx`, `StatusPill.tsx`, dll |
| SSE hook | `useTournamentSSE.ts` |
| Public bracket | `tournament/bracket/page.tsx` + `tournament/bracket/[id]/page.tsx` |
| Menu TopNav | `components/TopNav.tsx` baris 111 — link Tournament di admin menu |

---

## ❌ Bagian dari Spec yang BELUM Terimplementasi

### 1. enableTournament Flag di Event Settings ✅

**Spec:** Baris 58 — *"Event Model mendapat field enableTournament (Boolean, default false)"*  
**DB:** ✅ Schema sudah ada field-nya  
**UI:** ✅ Sudah ada — `EventConfig` interface di `settings/event/page.tsx` include `enableTournament` dan toggle tersedia. Backend `setActiveConfig()` handle field ini.

### 2. Import Peserta dari Guest List Event ✅ ⭐

**Spec:** Baris 60 — *"Jika terikat event, peserta tournament bisa diambil dari daftar Guest yang sudah terdaftar"*  
**Spec:** Baris 764 — *"Admin bisa registrasi tim/individu (manual, CSV import, dari guest list)"*  
**DB:** ✅ `TeamMember.guestId` sudah ada (nullable FK ke Guest)  
**Backend:** ✅ `addTeamMember()` di service sudah simpan `guestId`  
**UI:** ✅ **Guest picker sudah ada.** `TeamMemberFormModal.tsx` menggunakan endpoint `eligible-guests` untuk memilih dari tamu event aktif.

### 3. Tournament Terikat Event (Scoping by Active Event) ✅

**Spec:** Baris 59 — *"Tournament bisa dibuat tanpa event (standalone mode) ATAU terikat event"*  
**Kondisi:** ✅ Sudah terikat event aktif. Backend otomatis resolve `eventId` dari event aktif jika tidak diberikan.

### 4. Reuse File Upload untuk Logo Tim ✅

**Spec:** Baris 64 — *"File upload: Logo tim reuse upload infrastructure yang sudah ada"*  
**Status:** ✅ `TeamFormModal.tsx` mendukung upload file untuk `logo`, menggunakan `logosStorage()` via interceptor.

### 5. Live Match Display Route ✅

**Spec:** Baris 79 — *"Route /tournament/live/[matchId]"*  
**Status:** ✅ Route `/tournament/live/[matchId]` sudah dibuat dan link "Live Display" ditambahkan ke MatchCard admin.

### 6. Integration Checklist (Spec baris 782-786)
| Tournament bisa di-enable per event | ✅ |
| Peserta bisa di-import dari Guest list | ✅ |
| Reuse SSE infrastructure | ✅ |
| Reuse file upload untuk logo tim | ✅ |
| Consistent design language | ✅ |

### 7. Advanced Features (Phase 4)
Double Elim, Round Robin, Swiss, Group+Knockout, Auto-scheduling, Export bracket — semua ❌ (mungkin sengaja ditunda).

---

## 🔍 Gap-Gap Integrasi Tambahan (di luar spec)

Ditemukan saat eksplorasi, tidak eksplisit di spec tapi penting untuk integrasi menyeluruh:

Semua GAP berikut telah diselesaikan ✅:
- **GAP A:** Kalender event sudah menampilkan indikator trophy tournament.
- **GAP B:** `getStats` sudah menyertakan `tournaments`.
- **GAP C:** Dashboard sudah memiliki Quick Link Tournament.
- **GAP D:** Tournament form otomatis mengambil `startDate` default dari `Event.date`.
- **GAP E:** Public bracket page sekarang digate by `enableTournament`.
- **GAP F:** Endpoint `GET /tournaments/:id/eligible-guests?q=...` sudah dibuat.


---

## 📋 Ringkasan Prioritas Integrasi

### 🔴 Prioritas Tinggi (Core Integration)
1. **Guest Picker untuk Team Member** — search/select tamu di `TeamMemberFormModal`, kirim `guestId`
2. **Tournament Scoped ke Event Aktif** — auto-link `eventId`, filter list by event (ikuti pattern GuestsService)
3. **Toggle `enableTournament` di Settings Event** — UI toggle + backend handle, gating visibility

### 🟡 Prioritas Sedang (Integrasi Lanjutan)
4. **Tournament di Kalender Event** — render tournament dgn `startDate` di calendar
5. **Event Stats include Tournament** — tambah `_count.tournaments` di `getStats()`
6. **Sync tanggal Event-Tournament** — auto-suggest & validasi range date

### 🟢 Prioritas Rendah (Enhancement)
7. **Dashboard widget Tournament**
8. **Upload logo tim via file** (reuse infrastructure)
9. **Live match display route** `/tournament/live/[matchId]`
10. **Gating public bracket by enableTournament**

---

## 📁 File yang Perlu Dimodifikasi per Prioritas

### Prioritas #1 — Guest Picker
| File | Perubahan |
|------|-----------|
| `components/tournament/team/TeamMemberFormModal.tsx` | Tambah guest search/select input |
| `lib/tournament-api.ts` | Method `searchGuests()` atau reuse `apiFetch` |
| `tournaments.controller.ts` | Endpoint `GET tournaments/:id/eligible-guests` |
| `tournaments.service.ts` | Method `getEligibleGuests()` — fetch guest by eventId, exclude yg sudah di tim |

### Prioritas #2 — Scope Event Aktif
| File | Perubahan |
|------|-----------|
| `components/tournament/TournamentForm.tsx` | Auto-set `eventId` dari event aktif |
| `admin/tournaments/page.tsx` | Panggil `getAll(activeEventId)` |
| `tournament/bracket/page.tsx` | Panggil `getAll(activeEventId)` |
| `tournaments.service.ts` | Tambah `getActiveEventId()` (ikuti pattern GuestsService) |

### Prioritas #3 — enableTournament Toggle
| File | Perubahan |
|------|-----------|
| `admin/settings/event/page.tsx` | Tambah `enableTournament` ke EventConfig + toggle UI |
| `events.service.ts` | Handle `enableTournament` di `setActiveConfig()` |
| `components/TopNav.tsx` | Cek `enableTournament` sebelum render link Tournament |
| `tournament/bracket/page.tsx` | Cek `enableTournament` atau redirect |

---

**Dokumen dibuat berdasarkan eksplorasi kode pada 2026-07-07**  
**Next step:** Implementasi sesuai prioritas setelah review user.

