# Verdict

**REDESIGN** — Total score is 12/30, and load-bearing principles #2 useful, #4 understandable, and #6 honest all scored 1. The existing frontend is functional but its generic glassmorphism/gold aesthetic, mixed-language copy, misleading labels, and visual noise require a purpose-driven redesign rather than surface polish.

## Highest-leverage moves

1. **Principle #4 (understandable)**: Replace mixed-language and inflated labels. Rename `"KOKPIT INTELIJEN"` to `"Dashboard"`, convert `"Eligible"` to `"Berhak"`, and remove jargon like `"Daftar Peserta Undian"`.
   Evidence: `admin/dashboard/page.tsx:108`, `luckydraw/page.tsx:1090`, `luckydraw/page.tsx:1138`.

2. **Principle #6 (honest)**: Fix label→behavior mismatches. Move event-level settings out of the kiosk "Pengaturan Check-in" modal; clarify that "Live" indicator tracks only SSE; reframe the uncheck-in warning as neutral information.
   Evidence: `checkin/page.tsx:1612`, `TopNav.tsx:154`, `admin/dashboard/page.tsx:393-394`.

3. **Principle #3 (aesthetic)**: Reduce the palette to one neutral family + one accent, remove the global noise overlay, and replace stacked blurs with a single, consistent surface treatment.
   Evidence: `globals.css:47-55` noise overlay, `globals.css:91-128` glass tokens, `tailwind.config.ts:10-25` 13-color palette.

4. **Principle #10 (as little design as possible)**: Consolidate repeated UI patterns into shared components and remove dead code (`StatsCard`, `colorMap`, unused imports).
   Evidence: `admin/dashboard/page.tsx:474-519` dead `StatsCard`, `TopNav.tsx:5` unused `UserCog`, `luckydraw/page.tsx:4` unused `Sparkles`.

5. **Principle #9 (environmentally friendly)**: Gate non-essential motion behind `prefers-reduced-motion`, remove the fixed noise layer from scrolling containers, and lazy-load heavy lucky-draw effects.
   Evidence: `globals.css:47-55` fixed noise overlay, 22 keyframe definitions, persistent `pulse-live` on connection indicator.
