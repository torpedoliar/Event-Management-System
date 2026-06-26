# Redesign Fix Specification

## Context

A premium SaaS redesign was applied to `apps/frontend`. Code review found 5 real issues caused by incomplete token/class migration and accessibility oversights. This spec describes how to fix them.

## Issues and Fixes

### 1. Orphaned Tailwind color tokens

**Problem**
`tailwind.config.ts` removed `accent`, `accentSoft`, `vivid`, `vividSoft`, and `secondary` from the `brand` palette. ~78 class references (`brand-accent`, `brand-vivid`, `brand-secondary`) remain in unmodified files. Tailwind JIT silently drops them, stripping color/background/border styling.

**Fix**
- Run a search for `brand-(accent|vivid|secondary)` across `apps/frontend`.
- For each reference, map to a new token:
  - `brand-accent` / `brand-accentSoft` → `brand-primary` / `brand-primarySoft` for highlights, or `brand-textMuted` for de-emphasized text.
  - `brand-vivid` / `brand-vividSoft` → `brand-primary` / `brand-primaryGlow`.
  - `brand-secondary` (the dark surface) → `brand-bgElevated` or `brand-surface`.
- Do not re-add the old tokens; complete the migration to the single gold accent.
- Prefer semantic mapping: errors stay `brand-danger`, warnings stay `brand-warning`, successes stay `brand-success`.

**Acceptance**
- `grep -R "brand-(accent|vivid|secondary)" apps/frontend --include="*.tsx" --include="*.ts" --include="*.css"` returns only occurrences inside docs/spec files, not runtime code.
- Build passes and no visible color regressions on affected pages.

---

### 2. Removed shared CSS utility classes

**Problem**
`globals.css` removed `.glass-card`, `.glass-card-dark`, `.surface-festive`, `.gradient-text-festive`, and `.float`. ~20 references remain in unmodified files, causing silent loss of blur/border/gradient/animation styling.

**Fix**
- Search for the removed class names.
- For `.glass-card` / `.glass-card-dark`: migrate consumers to `.surface-glass` or `.surface`.
- For `.surface-festive`: migrate to `.surface` with `border-t-brand-primary`.
- For `.gradient-text-festive`: migrate to `.gradient-text` (gold gradient) or plain `text-brand-primary`.
- For `.float`: replace with Tailwind `animate-bounce` or remove animation if purely decorative.
- Alternatively, restore minimal aliases in `globals.css` if many files depend on them. Prefer migration because the redesign intentionally removes festive/glass noise.

**Acceptance**
- `grep -R "glass-card\|glass-card-dark\|surface-festive\|gradient-text-festive\|\"float\"" apps/frontend --include="*.tsx" --include="*.ts" --include="*.css"` returns no runtime matches.
- Visual check on `admin/statistics`, `admin/system`, `luckydraw/carousel`, `luckydraw/winners`, `show/my`, `souvenir` shows no broken cards or missing text effects.

---

### 3. Button sizes below 44px touch target

**Problem**
`Button` `sm` (~32px) and `md` (~40px) heights fall below the 44px minimum touch target. `sm` is used in `TopNav`, `md` is the default app-wide.

**Fix**
Increase vertical padding in `components/ui/Button.tsx`:
- `sm`: change `py-2` to `py-2.5` (renders ~40px). Optionally increase to `py-3` for guaranteed 44px if text-xs line-height stays 16px. Target minimum 44px total height.
- `md`: change `py-2.5` to `py-3` (renders ~46px).
- Keep `lg` as is or ensure it stays ≥44px.

Recommended sizes object:
```ts
const sizes: Record<Size, string> = {
  sm: 'px-3 py-2.5 text-xs gap-1.5', // ~40px; consider py-3 for strict 44px
  md: 'px-4 py-3 text-sm gap-2',       // ~46px
  lg: 'px-6 py-3.5 text-base gap-2',   // ~50px
};
```

**Acceptance**
- `sm` and `md` buttons render at least 44px tall in browser devtools.
- No layout breakage in `TopNav`, `Pagination`, modals, or forms.

---

### 4. Button `asChild` accessibility bug

**Problem**
`Button asChild` renders a `<span>` that discards the child element. The span is not focusable and has no keyboard activation. In `TopNav` it wraps `<Link>`, so keyboard users cannot activate Login.

**Fix**
Implement proper `asChild` cloning:

```tsx
import { cloneElement, isValidElement } from 'react';

// in Button render
if (asChild && isValidElement(children)) {
  return cloneElement(children, {
    className: cn(base, variants[variant], sizes[size], className, children.props.className),
    ref,
    disabled: disabled || loading,
    // spread remaining props except asChild/loading/variant/size
  });
}
```

Constraints:
- Only one child is allowed when `asChild` is true.
- Loading spinner must still render. If `asChild`, prepend the spinner as a sibling inside the child if possible, or forbid `loading` + `asChild`.
- Ensure `disabled` is only passed to elements that accept it; guard for `<a>`.

Alternative (simpler): remove `asChild` entirely and style the `<Link>` directly in `TopNav`. This is acceptable if `asChild` is not used anywhere else.

**Acceptance**
- Login link in `TopNav` is keyboard-focusable and activatable with Enter.
- `Button asChild` does not render a `<span>`.
- TypeScript passes.

---

### 5. Generic 3-equal-column feature grid on About page

**Problem**
`app/about/page.tsx` uses `grid-cols-3` with six identical cards — the generic AI layout the redesign skill explicitly warns against.

**Fix**
Redesign the Features section:
- Use a 2-column asymmetric layout at desktop.
- Make the first card span 2 columns or use a staggered/zig-zag pattern.
- Vary card proportions: some cards larger, some smaller.
- Keep mobile single-column.
- Preserve all 6 features and their content.

Example structure:
```
Desktop:
┌──────────────┐ ┌──────────────┐
│ Feature 1    │ │ Feature 2    │
└──────────────┘ └──────────────┘
┌───────────────────────────────┐
│ Feature 3 (wide)              │
└───────────────────────────────┘
┌──────────────┐ ┌──────────────┐
│ Feature 4    │ │ Feature 5    │
└──────────────┘ └──────────────┘
┌───────────────────────────────┐
│ Feature 6 (wide)              │
└───────────────────────────────┘
```

**Acceptance**
- No `grid-cols-3` on the feature grid.
- Layout is asymmetric on desktop and readable on mobile.
- All 6 features remain.

---

## Implementation Order

1. Fix orphaned Tailwind tokens (issue 1) and removed CSS classes (issue 2) together — both require broad file search/replace.
2. Fix Button sizes (issue 3) and `asChild` (issue 4) in `components/ui/Button.tsx`, then update `TopNav.tsx` if needed.
3. Redesign About features grid (issue 5).
4. Run `tsc --noEmit` and `next build`.
5. Visual smoke test: login page, dashboard, about, admin/statistics, admin/system, luckydraw/carousel, show/my, souvenir.

## Notes

- Do not change backend, business logic, route flow, or auth behavior.
- Keep the single gold accent direction; do not reintroduce pink/purple/blue festive accents.
- Avoid glassmorphism except where `surface-glass` is intentionally used.
