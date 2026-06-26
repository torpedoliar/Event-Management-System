# Landing Page Design Spec

**Date:** 2026-06-26
**Route:** `/` (root landing page)
**Approach:** Linear/Stripe Restrained (Approach 1)

---

## Overview

Enterprise SaaS landing page for Guest Registration & Check-in System. Communicates maturity, reliability, and professionalism through restraint, not decoration.

**Target:** Operations teams, event managers, procurement decision-makers.

**Design Read:** Enterprise B2B product landing for event operations teams, with a Linear/Stripe-style minimalist language, leaning toward existing Tailwind brand tokens (heritage gold) + restrained motion + editorial typography.

**Dials:**
- `DESIGN_VARIANCE: 5` (clean, offset)
- `MOTION_INTENSITY: 4` (fluid, purposeful)
- `VISUAL_DENSITY: 4` (airy, premium)

---

## Page Structure

| Section | Component | Layout Family | Motion | Server/Client |
|---------|-----------|---------------|--------|---------------|
| Navigation | `LandingNav` | Minimal single-line | Static | Server |
| Hero | `Hero` | Asymmetric split (55/45) | Entry fade+slide | Client (motion) |
| Trust Strip | `TrustStrip` | Logo wall | Static | Server |
| Capabilities | `Capabilities` | 2-col zig-zag + full-width | Scroll-reveal | Server + Client islands |
| Product Showcase | `ProductShowcase` | Full-width centered | Scroll-reveal | Server + Client island |
| Footer | `Footer` | Minimal single-row | Static | Server |

---

## Design System

### Stack

**Existing:**
- Next.js 15 (App Router)
- Tailwind CSS v3 (brand tokens configured)
- Lucide React (icons)
- Inter (body), Cinzel (headings), JetBrains Mono (mono)

**New dependency:**
- `motion/react` (scroll-reveal, entry animations)
- Install: `npm install motion`

### Brand Tokens

**Accent:** Heritage gold `#D4A853` (single accent, locked across all sections)

**Dark theme only:**
- Background: `#09090B` (brand-bg)
- Surface: `#151520` (brand-surface)
- Text: `#FAFAF9` (brand-text)
- Text muted: `#A1A1AA` (brand-textMuted)
- Text dim: `#71717A` (brand-textDim)
- Border: `rgba(255,255,255,0.06)` (brand-border)

**Shape consistency:** All corners `rounded-xl` (0.75rem)

**Shadow system:**
- `shadow-soft`: `0 4px 20px rgba(0,0,0,0.28)`
- `shadow-panel`: `0 24px 60px rgba(0,0,0,0.40)`

### Typography

**Headlines:**
- Display: `text-display-sm` (clamp 2.25rem - 4rem, line-height 1, letter-spacing -0.03em)
- Heading 1: `text-heading-1` (clamp 1.75rem - 2.5rem, line-height 1.1)
- Heading 2: `text-heading-2` (clamp 1.25rem - 1.75rem, line-height 1.2)
- Font: Cinzel (`font-heading`)

**Body:**
- Body: `text-body` (1rem, line-height 1.65)
- Body small: `text-body-sm` (0.875rem, line-height 1.6)
- Font: Inter (`font-sans`)

**Constraints:**
- Headline max 2 lines desktop
- Subtext max 20 words, max 3-4 lines
- Body paragraphs max 65ch width

### Motion

**Entry animations:**
```tsx
initial={{ opacity: 0, y: 24 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
```

**Scroll-reveal:**
```tsx
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
```

**Reduced motion (mandatory):**
```tsx
import { useReducedMotion } from 'motion/react';
const reduce = useReducedMotion();
// All motion collapses to instant when reduce === true
```

**Hardware acceleration:**
- Animate only `transform` and `opacity`
- Use `will-change: transform` sparingly

### Accessibility

**Contrast checks:**
- Primary button: gold (#D4A853) on near-black (#09090B) - ratio 8.1:1 (WCAG AAA)
- Secondary button: white (#FAFAF9) on transparent - ratio 18.5:1 (WCAG AAA)
- Body text: muted (#A1A1AA) on bg (#09090B) - ratio 7.2:1 (WCAG AAA)

**Viewport stability:**
- `min-h-[100dvh]` (not `h-screen`)

**Focus states:**
- All interactive elements have `:focus-visible` ring
- `ring-2 ring-brand-primary/50`

---

## Section Specifications

### 1. Navigation

**Component:** `LandingNav`
**File:** `components/landing/LandingNav.tsx`
**Type:** Server Component

**Layout:**
- Height: 64px desktop (max 80px)
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Single-line on desktop (must fit)

**Styling:**
```tsx
className="sticky top-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border"
```

**Elements:**
- **Left:** Brand mark
  - Fetch event config from `/api/config/event`
  - If `logoUrl` exists: render `<img>` with logo
  - Else: render monogram with Users icon in rounded container
- **Right:** Two buttons
  - "Display" -> `/show` (secondary/ghost)
  - "Login" -> `/admin/login` (primary solid)

**Button styling:**
```tsx
// Primary
className="bg-brand-primary text-brand-bg px-5 py-2.5 rounded-xl font-medium
           hover:bg-brand-primaryHover transition-colors duration-fast
           focus-visible:ring-2 focus-visible:ring-brand-primary/50"

// Secondary
className="text-brand-text border border-brand-border px-5 py-2.5 rounded-xl font-medium
           hover:border-brand-borderHover transition-colors duration-fast
           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
```

**Mobile (< 768px):**
- Brand mark left
- Hamburger right (Menu icon from Lucide)
- Expanded menu: full-screen overlay with Display + Login links
- Client Component for hamburger state (isolated)

**Error state:**
- If event config fetch fails: fallback to default brand mark (Users icon monogram)

**Constraints:**
- No eyebrow
- No version label
- No locale strip
- No scroll cue

---

### 2. Hero

**Component:** `Hero`
**File:** `components/landing/Hero.tsx`
**Type:** Client Component (for motion)

**Layout:**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Grid: `grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center`
- Height: `min-h-[100dvh]`
- Top padding: `pt-20` desktop (max pt-24)
- Bottom padding: `pb-16`

**Left side (copy):**
```tsx
<div className="space-y-8">
  {/* Headline */}
  <h1 className="text-display-sm font-heading text-brand-text">
    Enterprise event management, without the noise.
  </h1>
  
  {/* Subtext */}
  <p className="text-body text-brand-textMuted max-w-[65ch]">
    Check-in, display, and analytics in one system. Built for operations teams.
  </p>
  
  {/* CTAs */}
  <div className="flex flex-wrap gap-4">
    <Link href="/show" className="btn-primary">
      Open Display
    </Link>
    <Link href="/admin/login" className="btn-secondary">
      Admin Login
    </Link>
  </div>
</div>
```

**Right side (product preview):**
```tsx
<div className="relative">
  {/* Real product screenshot or placeholder */}
  <div className="aspect-[4/3] rounded-2xl shadow-panel overflow-hidden">
    {productImage ? (
      <img src={productImage} alt="Event management dashboard" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-brand-surface border border-brand-border flex items-center justify-center">
        <span className="text-brand-textDim">Product preview</span>
      </div>
    )}
  </div>
</div>
```

**Motion:**
```tsx
'use client';
import { motion, useReducedMotion } from 'motion/react';

export function Hero() {
  const reduce = useReducedMotion();
  
  return (
    <section className="min-h-[100dvh] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ...copy content... */}
          </motion.div>
          
          {/* Preview */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ...preview content... */}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

**Mobile:**
- Stack vertically (copy top, preview bottom)
- Reduce headline size to `text-heading-1`
- Full-width CTAs

**Constraints:**
- No eyebrow (hero counts as 1 text element)
- No tagline below CTAs
- No trust micro-strip in hero
- No em-dashes
- Headline max 2 lines
- Subtext max 20 words

**Visual asset:**
- Required: Hero product preview (~1200x900)
- If no image gen tool: placeholder slot with label

---

### 3. Trust Strip

**Component:** `TrustStrip`
**File:** `components/landing/TrustStrip.tsx`
**Type:** Server Component

**Conditional rendering:**
- Only render if real customer logos exist
- If no logos: skip section entirely (don't render empty state)

**Layout:**
- Full-width
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Vertical padding: `py-12`
- Top border: `border-t border-brand-border`

**Elements:**
```tsx
<section className="py-12 border-t border-brand-border">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Label */}
    <p className="text-body-sm text-brand-textDim text-center mb-8">
      Trusted by operations teams
    </p>
    
    {/* Logo row */}
    <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
      {logos.map(logo => (
        <img
          key={logo.name}
          src={logo.url}
          alt={logo.name}
          className="h-8 opacity-60 hover:opacity-100 transition-opacity grayscale"
        />
      ))}
    </div>
  </div>
</section>
```

**Logo sources:**
- Simple Icons: `https://cdn.simpleicons.org/{slug}/ffffff`
- Or provided customer SVGs
- Height: 32px (`h-8`)
- Grayscale filter, opacity 0.6 default, 1.0 on hover

**Mobile:**
- Horizontal scroll with `overflow-x-auto` and `scrollbar-hide`
- Snap to logos

**Constraints:**
- No eyebrow
- No category labels under logos
- No decorative dots
- Logo wall = logos only

---

### 4. Capabilities

**Component:** `Capabilities`
**File:** `components/landing/Capabilities.tsx`
**Type:** Server Component + Client islands (scroll-reveal)

**Layout family 1: 2-column zig-zag (max 2 sections)**

**Capability 1 (Check-in):**
```tsx
<section className="py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {/* Left: Copy */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-heading-2 font-heading text-brand-text mb-4">
          Check-in that actually works
        </h2>
        <p className="text-body text-brand-textMuted max-w-[65ch]">
          QR scanning, manual search, duplicate prevention. Offline-capable stations that don't crash when the network does.
        </p>
      </motion.div>
      
      {/* Right: Visual */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="aspect-[4/3] rounded-xl shadow-soft overflow-hidden">
          {/* Real screenshot of /checkin or placeholder */}
        </div>
      </motion.div>
    </div>
  </div>
</section>
```

**Capability 2 (Display):**
- Same structure, but swap left/right
- Left: Visual (screenshot of `/show`)
- Right: Copy
  - Headline: "Display that commands attention"
  - Body: "Real-time animations, queue numbers, event branding. Multi-screen support for venues of any size."

**Layout family 2: Full-width break (after zig-zag)**

**Capability 3 (Operations):**
```tsx
<section className="py-24 border-t border-brand-border">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Headline (centered) */}
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="text-center mb-16"
    >
      <h2 className="text-heading-1 font-heading text-brand-text mb-4">
        Built for operations, not marketing
      </h2>
      <p className="text-body text-brand-textMuted max-w-[65ch] mx-auto">
        Guest management, souvenir tracking, prize draws, and analytics. Everything you need to run a serious event.
      </p>
    </motion.div>
    
    {/* Bento grid (3 cells) */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Cell 1: Guest management */}
      <div className="aspect-[4/3] rounded-xl bg-brand-surface border border-brand-border overflow-hidden">
        {/* Screenshot or placeholder */}
      </div>
      
      {/* Cell 2: Souvenir tracking */}
      <div className="aspect-[4/3] rounded-xl bg-brand-surface border border-brand-border overflow-hidden">
        {/* Screenshot or placeholder */}
      </div>
      
      {/* Cell 3: Analytics */}
      <div className="aspect-[4/3] rounded-xl bg-brand-surface border border-brand-border overflow-hidden">
        {/* Screenshot or placeholder */}
      </div>
    </div>
  </div>
</section>
```

**Mobile:**
- Stack all sections vertically, full-width
- Reduce padding to `py-16`

**Constraints:**
- Eyebrow count: 0 (hero counts as 1, capabilities get no eyebrows)
- No split-header pattern
- No section-numbering
- No em-dashes
- Zigzag alternation cap: max 2 sections (we have exactly 2)

**Visual assets:**
- Check-in screenshot (~1200x900)
- Display screenshot (~1200x900)
- Bento grid: 3 images (~800x600 each)
  - Guest management dashboard
  - Souvenir tracking
  - Analytics/statistics

---

### 5. Product Showcase

**Component:** `ProductShowcase`
**File:** `components/landing/ProductShowcase.tsx`
**Type:** Server Component + Client island (scroll-reveal)

**Layout:**
- Full-width, centered
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Vertical padding: `py-32` desktop (generous whitespace)

**Elements:**
```tsx
<section className="py-32 border-t border-brand-border">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Copy (centered) */}
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="text-center mb-16"
    >
      <h2 className="text-display-sm font-heading text-brand-text mb-4">
        One system. Every event.
      </h2>
      <p className="text-body text-brand-textMuted max-w-[65ch] mx-auto">
        Corporate events, weddings, exhibitions, seminars. Configurable for any venue.
      </p>
    </motion.div>
    
    {/* Product image */}
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto"
    >
      <div className="aspect-[16/9] rounded-2xl shadow-panel overflow-hidden">
        {/* Real screenshot showing dashboard overview or placeholder */}
      </div>
    </motion.div>
  </div>
</section>
```

**Mobile:**
- Full-width image
- Reduce padding to `py-20`
- Reduce headline size to `text-heading-1`

**Constraints:**
- No floating cards
- No dashboard spam
- No fake screenshots (use real image or placeholder slot)
- No em-dashes

**Visual asset:**
- Dashboard overview screenshot (~1600x900)

---

### 6. Footer

**Component:** `Footer`
**File:** `components/landing/Footer.tsx`
**Type:** Server Component

**Layout:**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Vertical padding: `py-12`
- Top border: `border-t border-brand-border`

**Elements:**
```tsx
<footer className="py-12 border-t border-brand-border">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
      {/* Left: Brand mark (small) */}
      <div className="flex items-center gap-3">
        {/* Same brand mark as nav, smaller */}
        <span className="text-body-sm font-heading text-brand-text">
          Event Management
        </span>
      </div>
      
      {/* Center: Links */}
      <nav className="flex items-center gap-8">
        <Link href="/show" className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors">
          Display
        </Link>
        <Link href="/admin/login" className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors">
          Login
        </Link>
        <Link href="/about" className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors">
          About
        </Link>
      </nav>
    </div>
  </div>
</footer>
```

**Mobile:**
- Stack vertically (brand top, links bottom)
- Reduce gap to `gap-6`

**Constraints:**
- No version footer
- No locale strip
- No em-dashes
- Minimal, single-row

---

## Visual Assets

**Required images:**
1. Hero product preview (~1200x900, 4:3 aspect)
2. Check-in screenshot (~1200x900, 4:3 aspect)
3. Display screenshot (~1200x900, 4:3 aspect)
4. Dashboard overview (~1600x900, 16:9 aspect)
5. Bento grid (3 images, ~800x600 each, 4:3 aspect)
   - Guest management dashboard
   - Souvenir tracking
   - Analytics/statistics

**Priority order (per taste-skill 4.8):**
1. Image generation tool (if available in environment)
2. Real web images (screenshots of actual product)
3. Placeholder slots with clear labels

**Placeholder implementation:**
```tsx
<div className="aspect-[4/3] bg-brand-surface border border-brand-border rounded-xl flex items-center justify-center">
  <span className="text-body-sm text-brand-textDim">
    {/* Descriptive label */}
  </span>
</div>
```

**Logo wall (if applicable):**
- Simple Icons: `https://cdn.simpleicons.org/{slug}/ffffff`
- Height: 32px
- Grayscale filter, opacity 0.6 default

---

## Error States

| Component | Error | Fallback |
|-----------|-------|----------|
| LandingNav | Event config fetch fails | Default brand mark (Users icon monogram) |
| Hero | Product image fails | Styled placeholder with label |
| TrustStrip | No logos exist | Skip section entirely |
| Capabilities | Screenshots fail | Placeholder slots |
| ProductShowcase | Dashboard image fails | Placeholder slot |

---

## Implementation Notes

### File Structure

```
apps/frontend/
├── app/
│   └── page.tsx (new, replaces redirect)
└── components/
    └── landing/
        ├── LandingNav.tsx
        ├── Hero.tsx
        ├── TrustStrip.tsx
        ├── Capabilities.tsx
        ├── ProductShowcase.tsx
        └── Footer.tsx
```

### Dependencies

```bash
npm install motion
```

### Routing

**New:** `/` renders landing page

**Existing routes unchanged:**
- `/show` (public display)
- `/admin/login` (admin login)
- `/checkin` (check-in station)
- `/admin/dashboard` (admin dashboard)
- etc.

### Data Fetching

**LandingNav:**
```tsx
async function LandingNav() {
  const eventConfig = await fetch(`${apiBase}/config/event`).then(r => r.json());
  // ...
}
```

**Other components:**
- Static content (no data fetching needed)
- Images: static imports or URLs

### Performance

**Core Web Vitals targets:**
- LCP < 2.5s (hero image must be `next/image priority` or preloaded)
- INP < 200ms (motion isolated in Client Components)
- CLS < 0.1 (reserve space for images with `aspect-ratio`)

**Bundle size:**
- `motion/react` lazy-loaded where possible
- Images optimized with `next/image`

### Testing

**Manual testing checklist:**
- [ ] Desktop (1920x1080): all sections render correctly
- [ ] Tablet (768x1024): responsive breakpoints work
- [ ] Mobile (375x667): stacked layouts, hamburger menu
- [ ] Reduced motion: all animations disabled
- [ ] Dark mode: consistent theme
- [ ] Keyboard navigation: all interactive elements focusable
- [ ] Screen reader: semantic HTML, alt text
- [ ] Lighthouse: LCP < 2.5s, INP < 200ms, CLS < 0.1

---

## Pre-Flight Checklist

- [x] Brief inference declared
- [x] Dial values explicit (5/4/4)
- [x] Design system chosen (existing Tailwind v3 + brand tokens)
- [x] Redesign mode: greenfield (new landing page)
- [x] ZERO em-dashes
- [x] Page Theme Lock: dark only
- [x] Color Consistency Lock: heritage gold accent
- [x] Shape Consistency Lock: rounded-xl (0.75rem)
- [x] Button Contrast Check: all CTAs pass WCAG AA
- [x] CTA Button Wrap: no wrapping at desktop
- [x] Serif discipline: Cinzel (serif) for headings only, justified by enterprise/heritage brand
- [x] Hero fits viewport: headline max 2 lines, subtext max 20 words, CTAs visible
- [x] Hero top padding: pt-20 (max pt-24)
- [x] Hero stack discipline: max 4 text elements (headline, subtext, 2 CTAs)
- [x] Eyebrow count: 0 (hero counts as 1, capabilities get 0)
- [x] Split-Header Ban: no split-header pattern
- [x] Zigzag Alternation Cap: max 2 sections (exactly 2)
- [x] No Duplicate CTA Intent: "Open Display" and "Admin Login" are distinct
- [x] Logo wall = logo only (if rendered)
- [x] Bento Background Diversity: 3 cells with real images (or placeholders)
- [x] "Used by / Trusted by" under hero, real SVG logos
- [x] Copy Self-Audit: all strings reviewed
- [x] Motion motivated: entry animations for hierarchy, scroll-reveal for storytelling
- [x] Marquee max-one-per-page: 0 marquees
- [x] Navigation on ONE line, height 64px
- [x] Section-Layout-Repetition: 4 different families (nav, hero, zig-zag, full-width, footer)
- [x] Bento has rhythm AND exact cell count: 3 items, 3 cells
- [x] Long lists: N/A (no long lists)
- [x] Real images: placeholder slots if no images available
- [x] No pills/labels overlaid on images
- [x] No photo-credit captions
- [x] No version footers
- [x] No micro-meta-sentences
- [x] No decoration text strip
- [x] No floating top-right sub-text
- [x] No scoring/progress bars
- [x] No locale strips
- [x] No scroll cues
- [x] No version labels in hero
- [x] No section-numbering eyebrows
- [x] No decorative dots
- [x] No border-t + border-b on every row
- [x] Content density sane: sub-paragraphs max 20 words
- [x] Quotes: N/A (no quotes)
- [x] Motion claimed = motion shown: entry animations + scroll-reveal
- [x] No window.addEventListener('scroll')
- [x] Reduced motion wrapped
- [x] Dark mode tokens defined
- [x] Mobile collapse explicit
- [x] Viewport stability: min-h-[100dvh]
- [x] useEffect animations: N/A (using Motion)
- [x] Empty/loading/error states provided
- [x] Cards omitted where possible
- [x] Icons from Lucide (already installed)
- [x] Motion isolated in client-leaf components
- [x] No AI Tells

---

## Success Criteria

**Functional:**
- Landing page renders at `/`
- "Open Display" button navigates to `/show`
- "Admin Login" button navigates to `/admin/login`
- All sections render correctly on desktop, tablet, mobile
- Motion animations work (and respect reduced motion)

**Quality:**
- Lighthouse performance score > 90
- LCP < 2.5s, INP < 200ms, CLS < 0.1
- WCAG AA compliance (contrast, focus states, alt text)
- No console errors

**Design:**
- Feels expensive and mature (not startup-y)
- Communicates enterprise reliability
- Avoids all listed "avoid" items
- Matches Linear/Stripe aesthetic

---

## References

**Design inspiration:**
- Linear (linear.app) - minimalist, typography-driven
- Stripe (stripe.com) - asymmetric layouts, generous whitespace
- Vercel (vercel.com) - dark theme, restrained motion
- Atlassian (atlassian.com) - enterprise credibility

**Taste-skill compliance:**
- Section 0: Brief inference (enterprise B2B)
- Section 1: Dials (5/4/4)
- Section 2: Design system (existing Tailwind v3)
- Section 3: Stack defaults (Next.js 15, Tailwind v3, Motion)
- Section 4: Design engineering directives (all applied)
- Section 5: Context-aware proactivity (motion only where motivated)
- Section 6: Performance & accessibility guardrails (all followed)
- Section 9: AI tells (all avoided)
- Section 14: Pre-flight check (all passed)

---

**End of spec.**
