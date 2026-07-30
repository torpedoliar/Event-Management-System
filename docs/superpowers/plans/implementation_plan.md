# Rework LiveMatchDisplay & BracketView — Premium Sports Broadcast UI

Rework kedua komponen turnamen agar memiliki tampilan premium ala sports broadcast TV, terinspirasi dari referensi gambar yang dilampirkan.

## Proposed Changes

### LiveMatchDisplay Component

#### [MODIFY] [LiveMatchDisplay.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/components/tournament/match/LiveMatchDisplay.tsx)

Full rewrite with broadcast-style design:

- **Split-screen layout**: Team A di kiri (gradient hijau/emerald), Team B di kanan (gradient biru/slate), dengan divider "VS" di tengah
- **Cinematic header bar**: LIVE badge merah dengan pulse animation + timer monospace besar + nama turnamen & round info + court info
- **Large team logos**: Logo tim besar di sisi luar kiri/kanan (128px circles dengan glow ring)
- **Massive score display**: Angka skor sangat besar (9rem+) dengan font-mono, padding nol ("02" bukan "2"), winner highlighted hijau
- **Sets display**: Pill rounded bergaya premium di bawah skor
- **Team labels**: "HOME" / "AWAY" tag kecil di bawah nama tim
- **Completed state**: Overlay "MATCH COMPLETED" dengan crown icon untuk winner
- **Scheduled state**: Countdown-style "VS" besar dengan info jadwal
- **Background effects**: Radial gradient glow, subtle noise texture, particle-like dots
- **CSS Animations**: Score pulse on update, live indicator breathing, shimmer on header

**Data yang digunakan** (sudah tersedia dari Match type):
- `match.teamA`, `match.teamB` — nama + logo
- `match.scoreA`, `match.scoreB` — skor
- `match.setsA`, `match.setsB` — set (opsional)
- `match.status` — SCHEDULED / ONGOING / COMPLETED / WALKOVER
- `match.startedAt` — untuk timer
- `match.court` — lokasi court
- `match.round?.name` — nama round (Quarter-Final, Semi-Final, dll)
- `match.winnerId` — pemenang

---

### BracketView Components

#### [MODIFY] [BracketView.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/components/tournament/bracket/BracketView.tsx)

Polish layout dan visual:
- Tambah round header badges dengan background gradient
- Improve spacing dan visual hierarchy
- Smooth animated connector lines (gunakan gradient warna)
- Overall lebih "clean" dan premium

#### [MODIFY] [BracketMatchBox.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/components/tournament/bracket/BracketMatchBox.tsx)

Redesign match cards:
- Match number badge di kiri atas
- Lebih premium card design dengan inner glow
- Winner row highlight lebih jelas (gold/hijau accent)
- Live match animated border
- Hover effect lebih dramatic (scale + glow)

#### [MODIFY] [BracketConnector.tsx](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/components/tournament/bracket/BracketConnector.tsx)

- Gunakan SVG connector lines yang smooth
- Gradient color pada connector (dari muted ke brand-primary)
- Subtle animation saat hover

---

### Tailwind Config

#### [MODIFY] [tailwind.config.ts](file:///e:/Vibe/Registrasi%20Tamu/apps/frontend/tailwind.config.ts)

- Tambah keyframe `scorePulse` untuk animasi skor berubah
- Tambah keyframe `liveBreathe` untuk efek breathing live indicator
- Tambah animation utilities baru

## Verification Plan

### Manual Verification
- Build frontend berhasil tanpa error (`npm run build`)
- Tampilan LiveMatchDisplay terlihat premium di halaman `/tournament/live/[matchId]`
- BracketView terlihat premium di halaman `/tournament/bracket/[id]` dan admin tournament detail
