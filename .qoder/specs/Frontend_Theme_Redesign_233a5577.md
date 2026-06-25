# Frontend Theme Redesign: "Refined Dark Luxury + Vibrant Festive"

## Context

The Guest Registration & Check-in System is a full-featured event management platform with 24 pages spanning check-in kiosks, public displays, lucky draw (3 modes), souvenir distribution, and a comprehensive admin panel. The current "dark luxury" theme has become outdated and contains critical bugs: two color tokens (`brand-accent`, `brand-secondary`) are used across many files but never defined in `tailwind.config.ts`, causing invisible elements throughout the app. This redesign combines a refined dark luxury base with vibrant festive accents (coral-rose `#E86A92`, electric violet `#7C5CFC`) to create a celebratory yet premium feel fitting for events/weddings/celebrations. **Backend stays completely untouched** — only CSS classes, Tailwind tokens, component styling, and layout markup change.

---

## New Color System

| Token | Value | Purpose |
|-------|-------|---------|
| `brand-bg` | `#0B0B11` | Deepest background (richer black) |
| `brand-bgElevated` | `#141420` | Cards, panels, nav |
| `brand-bgSubtle` | `#1C1C2E` | NEW — hover states, table rows |
| `brand-secondary` | `#16162A` | **FIX** — deep navy-charcoal for secondary surfaces |
| `brand-surface` | `#1E1E32` | Card/panel backgrounds (redesignated from cream to dark) |
| `brand-surfaceMuted` | `#252540` | Muted surfaces, disabled |
| `brand-surfaceBright` | `#2A2A48` | NEW — highlighted cards |
| `brand-text` | `#F0EDF8` | Primary text (cool white) |
| `brand-textMuted` | `#9896B0` | Secondary text, labels |
| `brand-textDim` | `#6B6888` | NEW — tertiary, timestamps |
| `brand-primary` | `#D4A853` | Gold accent (preserved) |
| `brand-primarySoft` | `#F5ECD7` | Light gold |
| `brand-primaryGlow` | `rgba(212,168,83,0.25)` | NEW — glow effects |
| `brand-accent` | `#E86A92` | **FIX** — vibrant coral-rose |
| `brand-accentSoft` | `#F9A8C4` | NEW — soft pink |
| `brand-vivid` | `#7C5CFC` | NEW — electric violet |
| `brand-vividSoft` | `#B4A0FF` | NEW — soft violet |
| `brand-success` | `#4ADE80` | Brighter green |
| `brand-warning` | `#FBBF24` | Brighter amber |
| `brand-danger` | `#F87171` | Brighter red |
| `brand-info` | `#60A5FA` | Brighter blue |

**Gradient Presets**: `gradient-festive` (gold→coral→violet), `gradient-gold` (cream→gold→dark gold), `gradient-celebration` (coral→violet→blue)

---

## Task 1: Fix Foundation — Tailwind Config + Global CSS + Layout

**Files**: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`

### tailwind.config.ts
- Add ALL missing tokens: `brand-accent`, `brand-accentSoft`, `brand-secondary`, `brand-bgSubtle`, `brand-surfaceBright`, `brand-textDim`, `brand-vivid`, `brand-vividSoft`, `brand-primaryGlow`, `brand-borderActive`
- Update all existing color values to new palette
- Add new shadow tokens: `shadow-gold`, `shadow-accent`, `shadow-festive`
- Add transition tokens: `ease-bounce`, `ease-dramatic`, `duration-dramatic`
- Standardize border-radius: all form inputs to `rounded-lg`

### app/globals.css
- Remove all 12 redundant `--color-*` CSS variables (never used by any component)
- Add gradient CSS variables (`--gradient-festive`, `--gradient-gold`, `--gradient-celebration`)
- Define ALL currently-broken utility classes in `@layer components`:
  - `.glass` and `.glass-dark` (properly defined with backdrop-blur)
  - `.text-glow-gold`, `.text-glow-accent`, `.text-shadow-sm`, `.text-shadow-lg`
  - `.gradient-text-festive`
  - `.float`, `.pulse-live` with keyframes
- Add `.hide-top-nav` utility in `@layer utilities`
- Add new surface classes: `.surface-elevated`, `.surface-glass`, `.surface-festive`
- Move all keyframe animations from inline `<style>` tags (winners page) to globals.css
- Update body styles to use new `bg-brand-bg text-brand-text`

### app/layout.tsx
- Fix body class: `bg-brand-secondary` → `bg-brand-bg`
- Fix text class: `text-brand-surface` → `text-brand-text`
- Update selection colors with new palette

---

## Task 2: UI Component Library Redesign (17 files)

**Files**: All files in `components/ui/`

| Component | Changes |
|-----------|---------|
| `Button.tsx` | Update hover colors, ensure `rounded-lg`, add loading state |
| `Input.tsx` | `rounded-xl` → `rounded-lg`, update focus ring colors |
| `Select.tsx` | Remove dead `glass` variant, `rounded-lg`, update focus ring |
| `Textarea.tsx` | Remove dead `glass` variant, `rounded-lg` |
| `Card.tsx` | Remove dead `variant` prop, add `surface-elevated` support |
| `Modal.tsx` | Add entrance/exit animation (`fade-in + scale`), update backdrop to use blur |
| `Label.tsx` | `text-white/80` → `text-brand-textMuted` |
| `Alert.tsx` | Will auto-fix from Task 1 (brand-accent defined) |
| `Badge.tsx` | No changes needed |
| `StatusBadge.tsx` | No changes needed |
| `Toggle.tsx` | No changes needed |
| `IconButton.tsx` | No changes needed |
| `Pagination.tsx` | No changes needed |
| `Skeleton.tsx` | `bg-white/10` → `bg-brand-bgSubtle` |
| `FormRow.tsx` | No changes needed |
| `FormSection.tsx` | No changes needed |
| `utils.ts` | Replace simple join with `clsx` + `tailwind-merge` |

---

## Task 3: Shell & Navigation (3 files)

**Files**: `components/TopNav.tsx`, `components/ThemeBackground.tsx`, `components/EventSelector.tsx`

### TopNav.tsx
- Glass morphism: `bg-brand-bgElevated/90 backdrop-blur-md`
- Logo: gradient-bordered container using `gradient-gold`
- Active link: bottom border bar (`border-b-2 border-brand-primary`) instead of background tint
- Mobile: slide-out drawer with glass morphism instead of expanding inline
- Fixed height `h-14` (56px)

### ThemeBackground.tsx
- Fix `brand-secondary` and `brand-accent` usage (auto-fixes from Task 1)
- Add fourth orb using `brand-vivid`
- Improve overlay: gradient instead of flat black (`linear-gradient(to bottom, rgba(11,11,17,0.7), rgba(22,22,42,0.8))`)

### EventSelector.tsx
- Glass morphism dropdown panel
- Gold left-border accent for active event
- Replace `window.location.reload()` with React Query invalidation + brief loading overlay

---

## Task 4: Shared Components Fix (8 files, parallelizable)

**Files**: `ErrorBoundary.tsx`, `WebcamCapture.tsx`, `ConnectionStatusIndicator.tsx`, `QueueManagementPanel.tsx`, `StationSetupModal.tsx`, `CompanyStatsChart.tsx`, `WinnerHistoryModal.tsx`, `RequireAuth.tsx`

- Fix all `brand-secondary` and `brand-accent` references (auto-resolved from Task 1)
- Fix `glass-card` class in ErrorBoundary (now properly defined)
- Update styling to use new surface classes

---

## Task 5: Display Pages Redesign (6 files, parallelizable)

### `/show/page.tsx` — Public Display
- Check-in popup: glass morphism card with gold border accent, entrance animation with `ease-bounce`
- Guest name: Cinzel `display-md` with `text-glow-gold`
- Queue number badge: gold gradient background
- Waiting state: subtle floating particles (CSS-only), pulsing central icon
- **Preserve**: SSE checkin/config/preview/event_change listeners, background image/video, overlay opacity, auto-dismiss timer, clock

### `/show/my/page.tsx` — Personal Display
- Fix ALL broken classes: `glass-card-dark`, `text-shadow`, `text-shadow-lg`, `text-glow`, `popup-success`, `float`, `pulse-live`
- Match `/show` popup design
- **Preserve**: JWT auth, SSE filtered by checkedInById, recent history

### `/luckydraw/page.tsx` — Classic Lucky Draw
- Ticker: glass morphism panel with animated gold border
- Category drama: HIBURAN=gold only, UTAMA=full festive gradient
- Winner reveal: full-screen flash with `gradient-festive` overlay
- Fix: Remove duplicate `WinnerHistoryModal` (lines 934-946)
- Fix: Replace blocking sound overlay with non-blocking dismissible banner
- **Preserve**: Ticker animation, drama configs, confetti, audio system, fullscreen, eligible guests panel, SSE listeners

### `/luckydraw/carousel/page.tsx` — 3D Carousel
- Prize selector: glass morphism with gold border
- Wheel container: ambient glow using `shadow-festive`
- **Preserve**: 3D wheel, multi-wheel sequencing, audio, fullscreen, confetti

### `/luckydraw/display/page.tsx` — Slot Machine
- Reel housing: metallic dark gradient frame with gold trim
- Character glow on lock
- **Preserve**: SlotReel physics, per-column stagger, audio, fullscreen

### `/luckydraw/winners/page.tsx` — Hall of Fame
- Fix `brand-accent`/`brand-secondary` usage
- Prize cards: glass morphism with gold border shimmer
- Move inline `<style>` keyframes to globals.css
- **Preserve**: Auto-scroll, speed/direction controls, SSE, seamless loop

---

## Task 6: Kiosk Pages Redesign (3 large files, sequential)

### `/checkin/page.tsx` (2197 lines)
- Header: event logo with gold border frame
- QR scanner viewport: animated corner brackets with gold accent
- Guest result cards: `surface-interactive` with category-colored left border
- Success state: `gradient-gold` background flash
- Rapid scan mode: pulsing accent-colored border indicator
- Offline indicator: more prominent with `brand-danger` glow
- Search input: larger, more touch-friendly
- **PRESERVE ALL**: QR scanner (Html5Qrcode), offline sync (IndexedDB), rapid scan queue, photo capture, queue management, station setup modal, SSE listeners, connection status, auto-create guest, uncheck-in with password

### `/souvenir/page.tsx` (1806 lines)
- Match check-in page visual language for consistency
- Souvenir inventory: progress bars with gradient fills (gold→coral based on stock)
- Success state: `gradient-celebration` flash
- Receipt modal: cleaner layout with gold accent header
- **PRESERVE ALL**: QR scanner, offline sync, receipt modal, prize win display, inventory tracking, station setup

### `/about/page.tsx` (238 lines)
- Hero: `gradient-text-festive` heading (fixes broken brand-accent)
- Feature cards: hover glow using `shadow-gold`
- Fix all `brand-accent`/`brand-secondary` references
- **Preserve**: All content, links

---

## Task 7: Admin Pages Redesign (14 files, parallelizable)

### `/admin/login/page.tsx`
- Centered glass morphism card with gold top-border accent
- Subtle animated background (floating orbs)
- Gold gradient submit button with hover shimmer
- Error: shake animation + danger glow

### `/admin/dashboard/page.tsx`
- Stat cards: distinct accent color top-borders (gold/green/coral/violet)
- Animated progress bar with percentage label
- Quick actions: 2x3 grid with gold primary actions, outline navigation actions
- Chart area: subtle grid background
- **Preserve**: All SSE listeners, stat calculations, quick-add form, uncheck modal

### `/admin/guests/page.tsx` (1083 lines)
- Category badges: now properly render VVIP with fixed `brand-accent`
- Guest cards: photo + category color bar + check-in status indicator
- Search bar: prominent with filter chips
- Import/export: grouped action toolbar
- **Preserve**: ALL CRUD, category filtering, source tracking, QR code, CSV import/export, email, SSE, pagination

### `/admin/guests/new/page.tsx` and `/admin/guests/[id]/page.tsx`
- Consistent form layout with FormSection/FormRow
- Photo capture area: dashed gold border

### `/admin/events/page.tsx`
- Kanban columns: distinct header colors (violet=upcoming, gold=active, gray=past)
- Event cards: glass morphism with stats badges
- Active event: gold left-border accent

### `/admin/events/calendar/page.tsx`
- Calendar cells: hover elevation, today indicator with gold ring pulse
- Event dots: category-colored pills
- Fix `text-shadow-lg`, `brand-accent` in selected state

### `/admin/prizes/page.tsx`
- Prize cards: category-colored accent (gold=UTAMA, silver=HIBURAN)
- Winner list: expandable accordion per prize
- Export: grouped action bar

### `/admin/souvenirs/page.tsx`
- Inventory progress bars: gradient fills (green→gold→coral based on %)

### `/admin/statistics/page.tsx`
- Stat cards: accent color coding (match dashboard)
- Fix `brand-accent` usage in CompanyStatsChart

### `/admin/system/page.tsx`
- Health status: traffic light indicators (green/yellow/red) with glow
- Log viewer: monospace font on dark surface

### `/admin/settings/event/page.tsx`
- Logo upload: drag-and-drop with gold dashed border
- Background preview: live thumbnail with overlay opacity slider
- Category editor: live badge preview with new colors
- Fix VVIP `brand-accent` in category config

### `/admin/settings/email/page.tsx`
- Template editor: larger monospace textarea
- Organized into Connection/Sender sections

### `/admin/settings/users/page.tsx`
- User list: card layout with status badges
- Toggle: use existing Toggle component

---

## Task 8: LuckyDraw3DWheel Component

**File**: `components/LuckyDraw3DWheel.tsx`
- Update gradient and glow references to new palette
- Fix `brand-secondary` comment reference
- Test CSS 3D transforms carefully with new colors

---

## Task 9: Polish & Enhancement

- Add confetti color overrides to use new palette across all lucky draw modes
- Audit color contrast ratios for accessibility (WCAG AA minimum)
- Test all pages on tablet viewport (768px) for kiosk pages
- Test show/luckydraw pages on TV/projector viewport (1920x1080)
- Migrate inline `<style dangerouslySetInnerHTML>` from winners page to globals.css

---

## Verification Plan

1. **Build check**: Run `npm run build` in `apps/frontend` — must pass with zero errors
2. **Visual smoke test**: Start dev server and verify each of the 24 routes loads without console errors
3. **Token audit**: Grep for any remaining `brand-secondary` or `brand-accent` usage that doesn't resolve to defined values
4. **Broken class audit**: Grep for `glass-card`, `glass-card-dark`, `text-shadow`, `text-glow`, `popup-success`, `float`, `pulse-live`, `hide-top-nav` — all must now be defined
5. **Feature preservation**: Test each critical flow:
   - Check-in kiosk: QR scan → search → check-in → SSE popup on /show
   - Lucky draw: select prize → spin → winner reveal with confetti + audio
   - Admin: login → dashboard → guest CRUD → event switch
   - Souvenir: select souvenir → scan → distribute
6. **Browser verification**: Use Browser agent to navigate key pages and confirm visual quality

---

## Critical Files (all paths relative to `apps/frontend/`)

**Foundation** (Task 1): `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`
**Components** (Tasks 2-4): `components/ui/*.tsx` (17 files), `components/TopNav.tsx`, `components/ThemeBackground.tsx`, `components/EventSelector.tsx`, `components/ErrorBoundary.tsx`, `components/WebcamCapture.tsx`, `components/ConnectionStatusIndicator.tsx`, `components/QueueManagementPanel.tsx`, `components/StationSetupModal.tsx`, `components/CompanyStatsChart.tsx`, `components/WinnerHistoryModal.tsx`, `components/RequireAuth.tsx`
**Pages** (Tasks 5-7): All 24 `page.tsx` files across `app/` directory
**Special** (Task 8): `components/LuckyDraw3DWheel.tsx`

---

## Risks

1. **Projector color accuracy**: New deeper backgrounds (`#0B0B11`) may render differently on projectors — test on actual hardware
2. **Confetti color harmony**: `canvas-confetti` default colors may clash with new palette — pass custom color arrays
3. **`cn()` utility**: Current simple string join can't handle class conflicts — upgrading to `clsx`+`tailwind-merge` recommended
4. **Large file risk**: `checkin/page.tsx` (2197 lines) and `souvenir/page.tsx` (1806 lines) — touch ONLY class names and inline styles, never logic
5. **SSE/Offline logic**: All real-time listeners and IndexedDB operations must remain completely untouched