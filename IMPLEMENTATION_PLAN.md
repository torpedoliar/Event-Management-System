# Implementation Plan: Tournament Pages Audit Fixes

**Tanggal:** 2026-07-10  
**Audit Source:** `/impeccable audit admin/tournaments/ tournament/bracket/`  
**Health Score:** 11/20 (Acceptable)  
**Priority:** P0, P1, P2, P3 issues

---

## Ringkasan Temuan

| Severity | Count | Kategori |
|----------|-------|----------|
| P0 (Blocking) | 3 | Theming, Modal A11y, Search Label |
| P1 (Major) | 4 | Contrast, Table Semantics, Component Theming |
| P2 (Minor) | 5 | Select Styling, Hover States, Scrollbar |
| P3 (Polish) | 3 | Additional refinements |

---

## PHASE 1: Critical P0 Fixes (Hari 1)

### 1.1 Public Bracket Page — Theming Consistency

**File:** `apps/frontend/app/(main)/tournament/bracket/page.tsx`

**Issue:** Page menggunakan Tailwind defaults (`slate-900`, `blue-500`) bukan brand tokens.

#### Complete Color Replacement Map

| # | Pattern Lama | Pattern Baru | Line |
|---|-------------|-------------|------|
| 1 | `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900` | `bg-brand-bg` | 92, 78, 103 |
| 2 | `bg-slate-900/80` | `bg-brand-bg/80` | 94 |
| 3 | `border-slate-700` | `border-brand-border` | 94, 117, 125, 150 |
| 4 | `text-yellow-500` | `text-brand-warning` | 97, 154 |
| 5 | `bg-yellow-500/10` | `bg-brand-warning/10` | 153 |
| 6 | `text-white` (headings) | `text-brand-text` | 98, 159 |
| 7 | `text-slate-400` | `text-brand-textMuted` | 100, 138, 169, 181 |
| 8 | `text-slate-500` | `text-brand-textDim` | 136, 137, 172 |
| 9 | `bg-slate-800/50` | `bg-brand-surface` | 92, 150 |
| 10 | `bg-slate-800` | `bg-brand-bgSubtle` | 117, 125 |
| 11 | `focus:ring-blue-500` | `focus:ring-brand-primary/50` | 117, 125 |
| 12 | `hover:border-blue-500/50` | `hover:border-brand-primary/50` | 150 |
| 13 | `hover:text-blue-400` | `hover:text-brand-primary` | 159, 181 |
| 14 | `bg-blue-600` (link button) | `bg-brand-primary text-brand-bg` | 83 |
| 15 | `hover:bg-blue-700` | `hover:bg-brand-primaryHover` | 83 |
| 16 | `border-blue-500` (spinner) | `border-brand-primary` | 69 |

#### Code Diff Preview

**Loading State (Lines 65-73):**
```tsx
// SEBELUM
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
    <p className="text-white">Loading...</p>
  </div>
</div>

// SESUDAH
<div className="min-h-screen bg-brand-bg flex items-center justify-center">
  <div className="text-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent mx-auto mb-4" />
    <p className="text-brand-text">Loading...</p>
  </div>
</div>
```

**Header Section (Lines 92-104):**
```tsx
// SEBELUM
<header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
  <div className="max-w-6xl mx-auto px-4 py-8">
    <div className="flex items-center gap-3 mb-2">
      <Trophy className="w-8 h-8 text-yellow-500" />
      <h1 className="text-3xl font-bold text-white">Tournament Brackets</h1>
    </div>
    <p className="text-slate-400">View live brackets and match results...</p>
  </div>
</header>

// SESUDAH
<header className="bg-brand-bg/80 backdrop-blur-sm border-b border-brand-border">
  <div className="max-w-6xl mx-auto px-4 py-8">
    <div className="flex items-center gap-3 mb-2">
      <Trophy className="w-8 h-8 text-brand-warning" />
      <h1 className="text-3xl font-bold text-brand-text">Tournament Brackets</h1>
    </div>
    <p className="text-brand-textMuted">View live brackets and match results...</p>
  </div>
</header>
```

**Search Input (Lines 111-118):**
```tsx
// SEBELUM
<input
  type="text"
  placeholder="Search tournaments..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
/>

// SESUDAH - Plus A11y fix
<input
  id="search-tournaments"
  type="text"
  aria-label="Search tournaments"
  placeholder="Search tournaments..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-3 bg-brand-bgSubtle border border-brand-border rounded-xl text-brand-text placeholder:text-brand-textDim focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
/>
```

**Tournament Card (Lines 147-183):**
```tsx
// SEBELUM
<Link
  key={tournament.id}
  href={'/tournament/bracket/' + tournament.id}
  className="group bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-200"
>
  <div className="p-3 bg-yellow-500/10 rounded-lg">
    <Trophy className="w-6 h-6 text-yellow-500" />
  </div>
  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400">
    {tournament.name}
  </h3>
  <p className="text-slate-400 text-sm capitalize mb-4">
    {tournament.sportType?.toLowerCase().replace('_', ' ')}
  </p>
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-4 text-slate-500">
      <span className="flex items-center gap-1">
        <Users className="w-4 h-4" />
        {tournament.teams?.length || 0}
      </span>
    </div>
    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
  </div>
</Link>

// SESUDAH
<Link
  key={tournament.id}
  href={'/tournament/bracket/' + tournament.id}
  className="group bg-brand-surface border border-brand-border rounded-xl p-6 hover:border-brand-primary/50 hover:bg-brand-surfaceMuted/50 transition-all duration-200"
>
  <div className="p-3 bg-brand-warning/10 rounded-lg">
    <Trophy className="w-6 h-6 text-brand-warning" />
  </div>
  <h3 className="text-lg font-semibold text-brand-text mb-2 group-hover:text-brand-primary">
    {tournament.name}
  </h3>
  <p className="text-brand-textMuted text-sm capitalize mb-4">
    {tournament.sportType?.toLowerCase().replace('_', ' ')}
  </p>
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-4 text-brand-textDim">
      <span className="flex items-center gap-1">
        <Users className="w-4 h-4" />
        {tournament.teams?.length || 0}
      </span>
    </div>
    <ExternalLink className="w-4 h-4 text-brand-textDim group-hover:text-brand-primary transition-colors" />
  </div>
</Link>
```

---

### 1.2 Modal Accessibility — Create Tournament

**File:** `apps/frontend/app/(main)/admin/tournaments/page.tsx`

**Issue:** Modal missing `role="dialog"`, `aria-modal`, dan focus management.

#### Code Diff (Lines 214-239)

```tsx
// SEBELUM
{showCreateModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-brand-border">
      <div className="flex items-center justify-between p-6 border-b border-brand-border sticky top-0 bg-brand-surface/90 backdrop-blur z-10">
        <h2 className="text-2xl font-bold text-brand-text">Create Tournament</h2>
        <button
          onClick={() => setShowCreateModal(false)}
          className="text-brand-textMuted hover:text-brand-text p-2 hover:bg-white/[0.04] rounded-lg transition-colors"
        >
          ×
        </button>
      </div>
      <div className="p-6">
        <TournamentForm ... />
      </div>
    </div>
  </div>
)}

// SESUDAH
{showCreateModal && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-tournament-title"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
  >
    <div className="bg-brand-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-brand-border animate-scaleIn">
      <div className="flex items-center justify-between p-6 border-b border-brand-border sticky top-0 bg-brand-surface/90 backdrop-blur z-10">
        <h2 id="create-tournament-title" className="text-2xl font-bold text-brand-text">Create Tournament</h2>
        <button
          onClick={() => setShowCreateModal(false)}
          aria-label="Close modal"
          className="text-brand-textMuted hover:text-brand-text p-2 hover:bg-white/[0.04] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">
        <TournamentForm ... />
      </div>
    </div>
  </div>
)}
```

**Tambahkan imports:**
```tsx
import { X } from "lucide-react";  // Jika belum ada
```

---

### 1.3 Table Accessibility — Add Scope

**File:** `apps/frontend/app/(main)/admin/tournaments/page.tsx`

**Issue:** Table headers missing `scope="col"`.

#### Code Diff (Lines 133-142)

```tsx
// SEBELUM
<thead className="bg-black/20 text-brand-textMuted text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
  <tr>
    <th className="px-6 py-4">Tournament</th>
    <th className="px-6 py-4">Status</th>
    <th className="px-6 py-4">Teams</th>
    <th className="px-6 py-4">Start Date</th>
    <th className="px-6 py-4 text-right">Actions</th>
  </tr>
</thead>

// SESUDAH
<thead className="bg-black/20 text-brand-textMuted text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
  <tr>
    <th scope="col" className="px-6 py-4">Tournament</th>
    <th scope="col" className="px-6 py-4">Status</th>
    <th scope="col" className="px-6 py-4">Teams</th>
    <th scope="col" className="px-6 py-4">Start Date</th>
    <th scope="col" className="px-6 py-4 text-right">Actions</th>
  </tr>
</thead>
```

---

## PHASE 2: Component Fixes (Hari 2)

### 2.1 Select Component — Brand Token Styling

**File:** `apps/frontend/components/ui/Select.tsx`

**Issue:** Select component tidak ada, atau styling tidak konsisten.

```tsx
import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from './utils';
import { ChevronDown } from 'lucide-react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, error, children, ...props },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none rounded-xl border bg-brand-bgSubtle/60 px-4 py-2.5 pr-10 text-sm text-brand-text',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary/60',
          'transition-all duration-fast ease-smooth cursor-pointer',
          error
            ? 'border-brand-danger focus:ring-brand-danger/40 focus:border-brand-danger/60'
            : 'border-brand-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-textMuted pointer-events-none" />
    </div>
  );
});

export default Select;
```

### 2.2 BracketView — Scroll Indicators

**File:** `apps/frontend/components/tournament/bracket/BracketView.tsx`

```tsx
// SEBELUM
<div className="w-full overflow-x-auto pb-4">
  <div className="flex gap-8 min-w-max p-4 items-stretch">
    ...
  </div>
</div>

// SESUDAH
<div className="relative">
  {/* Left fade - show when scrolled right */}
  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-brand-bg to-transparent pointer-events-none z-10 opacity-0 [&.can-scroll-left:not(:first-child)]:opacity-100" />
  
  <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
    <div className="flex gap-8 min-w-max p-4 items-stretch">
      ...
    </div>
  </div>
  
  {/* Right fade - show when can scroll right */}
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-brand-bg to-transparent pointer-events-none z-10" />
</div>
```

**Tambahkan scroll detection script:**
```tsx
// Di parent component atau useEffect
useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;
  
  const handleScroll = () => {
    const canScrollLeft = container.scrollLeft > 0;
    const canScrollRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 5;
    container.classList.toggle('can-scroll-left', canScrollLeft);
    container.classList.toggle('can-scroll-right', canScrollRight);
  };
  
  container.addEventListener('scroll', handleScroll);
  handleScroll(); // Initial check
  return () => container.removeEventListener('scroll', handleScroll);
}, []);
```

---

## PHASE 3: Validation (Hari 2)

### 3.1 Checklist Sebelum Merge

```
[x] Theming
  [x] Tidak ada lagi `from-slate-`, `bg-slate-`, `border-slate-` di tournament pages
  [x] Tidak ada lagi `focus:ring-blue-` di tournament pages
  [x] Semua trophy icon pakai `text-brand-warning`
  [x] Semua text putih jadi `text-brand-text`
  [x] Semua muted text jadi `text-brand-textMuted` atau `text-brand-textDim`

[x] Accessibility
  [x] Modal punya `role="dialog"` dan `aria-modal="true"`
  [x] Modal title punya `id` dan aria-labelledby reference
  [x] Search input punya `id` dan `aria-label`
  [x] Table headers punya `scope="col"`

□ Visual Check
  □ Admin pages dan public pages terlihat konsisten (satu visual system)
  □ Contrast ratio text ≥ 4.5:1
  □ Focus states terlihat jelas
  □ Hover states punya feedback visual

□ Performance
  □ No layout shift saat loading
  □ Animations tidak blocking interaction
  □ Reduced motion: animations disabled via media query
```

### 3.2 Manual Test Cases

1. **Theming Consistency**
   - [ ] Buka `/admin/tournaments` dan `/tournament/bracket` di tab berbeda
   - [ ] Bandingkan: background color, text color, accent colors
   - [ ] Harus terlihat "satu aplikasi yang sama"

2. **Accessibility**
   - [ ] Tab through create tournament modal
   - [ ] Screen reader: modal di-announce sebagai dialog
   - [ ] Screen reader: search input punya label

3. **Responsive**
   - [ ] Mobile: bracket horizontal scroll works
   - [ ] Tablet: tournament cards responsive grid
   - [ ] Desktop: full layout

4. **Contrast**
   - [ ] All text passes 4.5:1 ratio
   - [ ] Test dengan browser DevTools accessibility auditing

---

## PHASE 4: Extended Audit (Minggu Depan)

### 4.1 Files Lain dengan Slate Pollution

Berdasarkan audit grep, files berikut juga perlu dicek:

| Priority | File | Estimated Fix Time |
|----------|------|-------------------|
| High | `apps/frontend/app/(main)/checkin/page.tsx` | 30 min |
| High | `apps/frontend/app/(main)/luckydraw/page.tsx` | 30 min |
| High | `apps/frontend/app/(main)/luckydraw/display/page.tsx` | 30 min |
| Medium | `apps/frontend/app/(main)/show/page.tsx` | 20 min |
| Medium | `apps/frontend/app/(main)/souvenir/page.tsx` | 20 min |
| Medium | `apps/frontend/app/(main)/live/page.tsx` | 30 min |
| Low | `apps/frontend/app/(main)/admin/login/page.tsx` | 15 min |

### 4.2 Quick Audit Command

```bash
# Run focused audit pada public pages
/impeccable audit checkin luckydraw display show souvenir live

# Atau full audit dengan scan
/impeccable audit
```

---

## Resource Requirements

### Time Estimate

| Phase | Task | Duration |
|-------|------|----------|
| Phase 1.1 | Public bracket page theming | 2 hours |
| Phase 1.2 | Modal accessibility | 30 min |
| Phase 1.3 | Table accessibility | 15 min |
| Phase 2.1 | Select component | 30 min |
| Phase 2.2 | Bracket scroll | 30 min |
| Phase 3 | Validation & testing | 1 hour |
| **Total** | | **~5 hours** |

### Files to Modify

```
Modified:
  apps/frontend/app/(main)/tournament/bracket/page.tsx
  apps/frontend/app/(main)/admin/tournaments/page.tsx
  apps/frontend/components/ui/Select.tsx (create)
  apps/frontend/components/tournament/bracket/BracketView.tsx

Audit Later (separate sprint):
  apps/frontend/app/(main)/checkin/page.tsx
  apps/frontend/app/(main)/luckydraw/page.tsx
  apps/frontend/app/(main)/show/page.tsx
  apps/frontend/app/(main)/souvenir/page.tsx
  apps/frontend/app/(main)/live/page.tsx
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Low | High | Test setiap page sebelum commit |
| Brand token not defined | Low | Low | Check tailwind.config.ts |
| Animation conflicts | Medium | Low | Test reduced motion |
| Mobile scroll issues | Medium | Medium | Test on actual devices |

---

## Success Metrics

### Pre-Fix
- Audit Score: 11/20
- Theming Score: 1/4
- A11y Score: 2/4

### Post-Fix Target
- Audit Score: 16/20
- Theming Score: 3/4
- A11y Score: 3/4

### Verification
- [x] All P0 issues resolved (3/3)
- [x] All P1 issues addressed (4/4 — theming, table scope, modal a11y, spinner)
- [ ] P2 issues tracked for next sprint (5 remaining — scrollbar done)
- [ ] Visual consistency confirmed (needs manual QA)
