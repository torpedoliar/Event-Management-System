# Evidence

## Structural Evidence

- Total interactive-element count: ~110
  - Buttons ~50, Inputs ~8, Selects ~3, Links ~20 (subagent: Structural Evidence).
- Max nesting depth: ~15 levels in `/checkin/page.tsx` confirmation popup (lines 1869-2061).
- Repeated patterns:
  - Close/dismiss button: 5 locations.
  - Gradient check-in action button: 3 locations.
  - Glass card container: 3+ locations.
  - Guest ID mono input: 2 locations.
  - NavLink active-state pattern: 11 links generated from one function.
  - Toggle switch pattern: 3 identical hand-rolled toggles.
- Dead props / unused imports:
  - `admin/dashboard/page.tsx:11` imports `Calendar`, `MapPin` unused.
  - `admin/dashboard/page.tsx:474-519` `StatsCard` component defined but never used.
  - `admin/dashboard/page.tsx:467-472` `colorMap` defined but unused.
  - `TopNav.tsx:5` imports `UserCog` unused.
  - `luckydraw/page.tsx:4` imports `Sparkles` unused.

## Visual Evidence (INFERRED)

- Spacing scale: `[4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96]` px.
- Type scale: `[12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 120, 160]` px.
- Distinct color count: ~38 unique hex/rgba tokens (Tailwind brand 13 + globals.css 9 + inline hardcoded 16).
- Lowest contrast ratio: white text on `brand-primarySoft` `#F5ECD7` ≈ 1.8:1, used at `luckydraw/page.tsx:782`.
- States checklist:
  - empty: present (`show/page.tsx:174-188`, `checkin/page.tsx:1754-1762`).
  - loading: present (`Skeleton.tsx`, inline `Loader2` spinners).
  - error: present (`checkin/page.tsx:1556-1572`, `dashboard/page.tsx:126-129`).
  - success: present (`show/page.tsx:230-239`, `checkin/page.tsx:1905-1914`).
  - focus: present (`Button.tsx:13`, `Input.tsx:10`).
  - disabled: present (`Button.tsx:13`, many pages).

## Copy & Honesty Evidence

- Inflations: `"KOKPIT INTELIJEN"` at `admin/dashboard/page.tsx:108` adds no functional meaning.
- Dark patterns:
  - Confirmshaming nudge: error-only auto-create prompt at `checkin/page.tsx:1559-1571`.
  - Coercive warning: `"Membatalkan check-in akan mencabut hak undian tamu: {name}"` at `admin/dashboard/page.tsx:393-394`.
  - Hidden cost: offline queue 80% warning only appears after threshold (`checkin/page.tsx:633-635`).
- Jargon / unclear labels:
  - `"Daftar Peserta Undian"` → "Peserta" (`luckydraw/page.tsx:1090`).
  - `"Eligible"` mixed English → "Berhak" (`luckydraw/page.tsx:1138,1187,1231`).
  - `"Souvenir / Hadiah"` ambiguous nav label (`TopNav.tsx:114`).
  - `"Multiple Check-in Per Counter"` → "Check-in Berulang per Counter" (`checkin/page.tsx:1677`).
- Label→behavior mismatches:
  - `"Pengaturan Check-in"` modal contains event-level settings (`checkin/page.tsx:1612`, `1677`).
  - `"Auto Buat Tamu Baru"` only triggers on not-found, not proactive auto-creation (`checkin/page.tsx:1627`, `573-574`).
  - `"Check-in Manual"` behaves like normal search+check-in (`admin/dashboard/page.tsx:313`).
  - TopNav `Live / Offline` reflects SSE only, not actual API connectivity (`TopNav.tsx:154`).

## Weight & Friction Evidence

- Initial JS bytes: ~500-600 KB minified / ~150-200 KB gzipped (estimated from deps).
- Network request count per primary view: 1-3 explicit fetches (SSE excluded).
- Time-to-interactive estimate: 2-4s desktop, 4-6s mid-range mobile.
  - Multiple stacked `backdrop-filter: blur(32px)` cause layout thrashing (`globals.css:91-128`).
  - SVG noise filter fixed overlay (`globals.css:47-55`).
  - Lucky draw fetches up to 10,000 guests in one request (`luckydraw/page.tsx:445-449`).
- Animation count on idle screen: 22 CSS keyframes + ~20-25 inline animation class instances.
- Notification / badge / modal count on initial load: 0 (all gated by state).
