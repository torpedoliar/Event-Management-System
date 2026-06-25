/make-plan Redesign the guest registry frontend UI/UX (apps/frontend).

Primary user: event staff running check-in kiosks and admins monitoring attendance / lucky draw.
Primary task: register guest arrivals, monitor real-time check-in counts, run prize draws.
Constraints: Next.js 15 + React 18 + Tailwind CSS v3 + TypeScript, lucide-react icon set, existing warm-gold/charcoal brand palette, no backend changes, preserve offline mode / SSE / QR scan / photo capture / uncheck-in / lucky-draw animation.

Verdict paragraph (quoted from 03-verdict.md):
> REDESIGN — Total score is 12/30, and load-bearing principles #2 useful, #4 understandable, and #6 honest all scored 1. The existing frontend is functional but its generic glassmorphism/gold aesthetic, mixed-language copy, misleading labels, and visual noise require a purpose-driven redesign rather than surface polish.

Why redesign and not refine: Load-bearing principles #2, #4, and #6 scored 1, meaning the interface misleads users and obscures function; cosmetic changes cannot fix structural honesty and clarity problems.

Preserve from current design:
- Brand tokens only — warm gold primary `#D4A853` and charcoal secondary `#1A1A2E`. Discard everything else.
- Existing page routes and information architecture (show, checkin, admin/dashboard, luckydraw, admin/login, shared nav).
- Core functionality: offline IndexedDB sync, SSE listeners, QR scanning, photo capture, uncheck-in flow, grand-prize drama sequence.

Discard (structural patterns causing failures):
- Global fixed noise overlay + 22 decorative keyframe animations. Evidence: `globals.css:47-55`, `globals.css:91-128`, 22 keyframes. Caused failure on principle #5 unobtrusive and #9 environmentally friendly.
- 13-color brand palette + ~38 inline hardcoded colors. Evidence: `tailwind.config.ts:10-25`. Caused failure on principle #3 aesthetic.
- Inflated / mixed-language labels and label→behavior mismatches. Evidence: `"KOKPIT INTELIJEN"` (`admin/dashboard/page.tsx:108`), `"Eligible"` in Indonesian UI (`luckydraw/page.tsx:1138`), `"Pengaturan Check-in"` containing event-level settings (`checkin/page.tsx:1612`), `"Live"` indicator tracking only SSE (`TopNav.tsx:154`). Caused failure on principle #4 understandable and #6 honest.
- Dead code and duplicated close-button / glass-card / toggle patterns. Evidence: dead `StatsCard` (`admin/dashboard/page.tsx:474-519`), unused imports (`TopNav.tsx:5`, `luckydraw/page.tsx:4`), 5 hand-rolled close buttons. Caused failure on principle #10 as little design as possible.

Top 5 moves from the audit (verbatim):
1. Principle #4 (understandable): Replace mixed-language and inflated labels. Rename "KOKPIT INTELIJEN" to "Dashboard", convert "Eligible" to "Berhak", and remove jargon like "Daftar Peserta Undian". Evidence: `admin/dashboard/page.tsx:108`, `luckydraw/page.tsx:1090`, `luckydraw/page.tsx:1138`.
2. Principle #6 (honest): Fix label→behavior mismatches. Move event-level settings out of the kiosk "Pengaturan Check-in" modal; clarify that "Live" indicator tracks only SSE; reframe the uncheck-in warning as neutral information. Evidence: `checkin/page.tsx:1612`, `TopNav.tsx:154`, `admin/dashboard/page.tsx:393-394`.
3. Principle #3 (aesthetic): Reduce the palette to one neutral family + one accent, remove the global noise overlay, and replace stacked blurs with a single, consistent surface treatment. Evidence: `globals.css:47-55` noise overlay, `globals.css:91-128` glass tokens, `tailwind.config.ts:10-25` 13-color palette.
4. Principle #10 (as little design as possible): Consolidate repeated UI patterns into shared components and remove dead code (`StatsCard`, `colorMap`, unused imports). Evidence: `admin/dashboard/page.tsx:474-519` dead `StatsCard`, `TopNav.tsx:5` unused `UserCog`, `luckydraw/page.tsx:4` unused `Sparkles`.
5. Principle #9 (environmentally friendly): Gate non-essential motion behind `prefers-reduced-motion`, remove the fixed noise layer from scrolling containers, and lazy-load heavy lucky-draw effects. Evidence: `globals.css:47-55` fixed noise overlay, 22 keyframe definitions, persistent `pulse-live` on connection indicator.

Redesign principles in priority order:
1. #4 understandable — every label describes its behavior in plain Indonesian/English consistent with the rest of the UI.
2. #6 honest — no label implies a broader system state than it actually tracks; warnings state facts without coercion.
3. #3 aesthetic — one neutral family, one accent, consistent radius, consistent elevation.
4. #10 as little design as possible — shared components for repeated patterns; no decorative chrome that does not aid the task.
5. #9 environmentally friendly — motion is gated; heavy draw effects are lazy; no persistent CPU-heavy overlays.

Deliverables for the plan:
- New information architecture (keep routes, clarify nav grouping).
- New primary flow wireframes (check-in kiosk, admin dashboard, lucky draw) compared side-by-side to current.
- Consolidated token decisions (max 1 neutral family + 1 accent + semantic colors for success/warning/danger/info; one radius scale; one shadow scale).
- States checklist (empty, loading, error, success, focus, disabled) with shared implementations.
- Component consolidation map: shared `Toggle`, `Modal`, `CloseButton`, `GradientButton`, `StatusBadge` replacements.
- Reduced-motion strategy: which animations stay, which degrade, and how.
- Migration path: no backend changes; preserve localStorage keys, SSE event names, fetch endpoints.
- Cutover criteria: all existing flows (offline sync, QR, photo, uncheck-in, grand-prize sequence) still work; Lighthouse a11y/contrast pass; no dead code.

Anti-patterns to guard against (specific to REDESIGN):
- Porting old glass-card/noise/blur CSS under new class names.
- Keeping both old and new components behind a flag indefinitely.
- Redesigning to follow a trend rather than the principles above.
- Treating the Preserve list as optional — brand tokens and core functionality must survive.
