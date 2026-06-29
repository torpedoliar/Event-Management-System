# Landing Page Customization Design Spec

**Date:** 2026-06-27
**Revises:** [2026-06-26 Landing Page Design Spec](./2026-06-26-landing-page-design.md)
**Approach:** Relational database + dedicated admin page + dynamic landing page

---

## Overview

Enterprise SaaS landing page for Guest Registration & Check-in System, now fully customizable from a dedicated admin page. All text, features, hero images, and gallery photos are editable without code changes.

**Target:** Operations teams, event managers, procurement decision-makers.

**Design Read:** Enterprise B2B product landing with CMS-like customization, Linear/Stripe-style minimalist language, existing Tailwind brand tokens (heritage gold), dynamic content sections, restrained motion.

**Dials:**
- `DESIGN_VARIANCE: 6` (offset, dynamic)
- `MOTION_INTENSITY: 5` (fluid + image carousels)
- `VISUAL_DENSITY: 4` (airy, premium)

---

## Page Structure

| Section | Component | Layout Family | Motion | Server/Client |
|---------|-----------|---------------|--------|---------------|
| Navigation | `LandingNav` | Minimal single-line | Static | Server |
| Hero | `Hero` | Asymmetric split (55/45) | Entry fade + carousel crossfade | Client |
| Features | `Features` | Dynamic zig-zag + masonry | Scroll-reveal + carousel crossfade | Server + Client |
| Gallery | `Gallery` | Masonry/grid | Scroll-reveal | Server + Client |
| Footer | `Footer` | Minimal single-row | Static | Server |

---

## Database Schema

### New Prisma Models

```prisma
model LandingPageConfig {
  id                String   @id @default(uuid())
  eventId           String   @unique
  event             Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  // Hero copy
  heroHeadline      String   @default("Enterprise event management, without the noise.")
  heroSubtext       String   @default("Check-in, display, and analytics in one system. Built for operations teams.")
  heroCtaPrimary    String   @default("Open Display")
  heroCtaSecondary  String   @default("Admin Login")

  // Section toggles
  showHero          Boolean  @default(true)
  showFeatures      Boolean  @default(true)
  showGallery       Boolean  @default(true)
  showFooter        Boolean  @default(true)

  // Gallery copy
  galleryTitle      String   @default("Past Events")
  gallerySubtext    String   @default("Moments from events we have powered.")

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  heroImages        LandingPageHeroImage[]
  features          LandingPageFeature[]
  galleryImages     LandingPageGalleryImage[]
}

model LandingPageHeroImage {
  id          String   @id @default(uuid())
  configId    String
  config      LandingPageConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  url         String
  alt         String?
  sortOrder   Int      @default(0)
  intervalMs  Int      @default(5000)
  createdAt   DateTime @default(now())

  @@index([configId, sortOrder])
}

model LandingPageFeature {
  id          String   @id @default(uuid())
  configId    String
  config      LandingPageConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  title       String
  description String   @db.Text
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  images      LandingPageFeatureImage[]

  @@index([configId, sortOrder])
}

model LandingPageFeatureImage {
  id          String   @id @default(uuid())
  featureId   String
  feature     LandingPageFeature @relation(fields: [featureId], references: [id], onDelete: Cascade)
  url         String
  alt         String?
  sortOrder   Int      @default(0)
  intervalMs  Int      @default(5000)
  createdAt   DateTime @default(now())

  @@index([featureId, sortOrder])
}

model LandingPageGalleryImage {
  id          String   @id @default(uuid())
  configId    String
  config      LandingPageConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  url         String
  alt         String?
  caption     String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([configId, sortOrder])
}
```

### Migration

```bash
cd apps/backend
npx prisma migrate dev --name add_landing_page_config
npm run prisma:generate
```

### Seed

On first access to admin landing page settings, if no `LandingPageConfig` exists for active event, create default config with sample feature content.

---

## Backend API

### Public API (no authentication)

**`GET /public/landing-page`**

Returns public-safe landing page data for active event. No admin fields exposed.

```json
{
  "hero": {
    "headline": "Enterprise event management, without the noise.",
    "subtext": "Check-in, display, and analytics in one system. Built for operations teams.",
    "ctaPrimary": "Open Display",
    "ctaSecondary": "Admin Login",
    "images": [
      { "url": "/api/uploads/landing/hero/...", "alt": "...", "intervalMs": 5000 }
    ]
  },
  "features": [
    {
      "id": "...",
      "title": "Check-in that actually works",
      "description": "QR scanning, manual search, duplicate prevention.",
      "sortOrder": 0,
      "images": [
        { "url": "/api/uploads/landing/features/...", "alt": "...", "intervalMs": 5000 }
      ]
    }
  ],
  "gallery": {
    "title": "Past Events",
    "subtext": "Moments from events we have powered.",
    "images": [
      { "url": "/api/uploads/landing/gallery/...", "alt": "...", "caption": "..." }
    ]
  },
  "toggles": {
    "showHero": true,
    "showFeatures": true,
    "showGallery": true,
    "showFooter": true
  }
}
```

**Cache-Control:** `public, max-age=30`

### Admin API (JWT required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/landing-page` | JWT | Get full config for active event |
| PUT | `/admin/landing-page` | JWT | Update text + toggles |
| POST | `/admin/landing-page/hero-image` | JWT | Upload hero image |
| DELETE | `/admin/landing-page/hero-image/:id` | JWT | Delete hero image |
| PUT | `/admin/landing-page/hero-image/:id/order` | JWT | Reorder hero image |
| POST | `/admin/landing-page/features` | JWT | Create feature |
| PUT | `/admin/landing-page/features/:id` | JWT | Update feature |
| DELETE | `/admin/landing-page/features/:id` | JWT | Delete feature |
| PUT | `/admin/landing-page/features/:id/order` | JWT | Reorder feature |
| POST | `/admin/landing-page/features/:id/images` | JWT | Upload feature image |
| DELETE | `/admin/landing-page/features/:id/images/:imageId` | JWT | Delete feature image |
| PUT | `/admin/landing-page/features/:id/images/:imageId/order` | JWT | Reorder feature image |
| POST | `/admin/landing-page/gallery` | JWT | Upload gallery image |
| DELETE | `/admin/landing-page/gallery/:id` | JWT | Delete gallery image |
| PUT | `/admin/landing-page/gallery/:id/order` | JWT | Reorder gallery image |

### Image Upload Security

- All admin upload endpoints use `JwtAuthGuard`
- File size limit: 5MB
- Allowed mimetypes: `image/jpeg`, `image/png`, `image/webp`
- Stored under `uploads/landing/{hero|features|gallery}/`
- Served via existing `/api/uploads/*` static middleware

### Storage Function

New function in `apps/backend/src/common/storage.ts`:

```ts
export const landingPageStorage = (subfolder: 'hero' | 'features' | 'gallery') =>
  diskStorage({
    destination: (_req, _file, cb) =>
      cb(null, ensureDir(`uploads/landing/${subfolder}`)),
    filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
  });
```

---

## Admin UI Page

**Route:** `/admin/settings/landing-page`
**File:** `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx`
**Type:** Client Component

### New Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Layout

- Container: `max-w-5xl mx-auto p-6 md:p-8`
- Sticky save bar at bottom on mobile
- Matches Event Settings card style

### Section 1: Hero Settings

- **Headline** input
- **Subtext** textarea (max 200 chars)
- **CTA Primary** input
- **CTA Secondary** input
- **Hero Images:**
  - Preview grid (3 columns on desktop, 2 on tablet, 1 on mobile)
  - Drag-to-reorder
  - Delete per image
  - Upload button
  - Interval input per image (ms, min 3000)

### Section 2: Features Management

- **Add Feature** button
- Each feature card:
  - Title input
  - Description textarea
  - Active toggle
  - Delete button
  - Feature images:
    - Preview grid
    - Drag-to-reorder
    - Delete per image
    - Upload button
    - Interval input per image
- Drag-to-reorder feature cards

### Section 3: Gallery Settings

- Title input
- Subtext textarea
- Gallery images:
  - Masonry preview
  - Caption input per image
  - Drag-to-reorder
  - Delete per image
  - Upload button

### Section 4: Section Toggles

- Show Hero
- Show Features
- Show Gallery
- Show Footer

### Auto-save Strategy

- Text fields: auto-save on blur (debounced 500ms)
- Toggles: auto-save on change
- Uploads/reorders/deletes: immediate API call
- Success/error message inline (same pattern as Event Settings)

### Empty States

- Hero images: "No hero images. Upload to enable hero carousel."
- Features: "No features. Add a feature to display on landing page."
- Gallery: "No gallery images. Upload past event photos."

---

## Landing Page Components

### Data Fetching

```tsx
// app/(main)/page.tsx
async function getLandingPageData() {
  const res = await fetch(`${apiBase}/public/landing-page`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  return res.json();
}
```

### Navigation

**File:** `components/landing/LandingNav.tsx`
**Type:** Server Component

- Brand mark from event config (`/api/config/event`)
- Two buttons: Display → `/show`, Login → `/admin/login`
- **Removed:** About link
- Mobile hamburger menu

### Hero

**File:** `components/landing/Hero.tsx`
**Type:** Client Component

- Left: headline, subtext, two CTAs (text from config)
- Right: image carousel with auto-rotation
- Carousel behavior:
  - Auto-advance every `intervalMs`
  - Pause on hover
  - Dot indicators if > 1 image
  - Crossfade transition (300ms)
- Reduced motion: disable auto-advance, instant switch

```tsx
const [index, setIndex] = useState(0);
useEffect(() => {
  if (reduce || images.length <= 1) return;
  const timer = setInterval(() => setIndex(i => (i + 1) % images.length), interval);
  return () => clearInterval(timer);
}, [images, interval, reduce]);
```

### Features

**File:** `components/landing/Features.tsx`
**Type:** Server Component + Client islands

- Render active features in `sortOrder`
- Layout alternates for first 2 features (zig-zag)
- Features 3+ use centered single-column layout to avoid repetition
- Each feature has text + image carousel
- Carousel same behavior as Hero

### Gallery

**File:** `components/landing/Gallery.tsx`
**Type:** Server Component + Client island

- Title + subtext from config
- Masonry grid (3 cols desktop, 2 tablet, 1 mobile)
- Images with optional captions
- Hover: subtle scale (1.02)
- Reduced motion: no scale

### Footer

**File:** `components/landing/Footer.tsx`
**Type:** Server Component

- Brand mark left
- Links center: Display, Login
- **About link removed**

---

## Design System

### Stack

**Existing:**
- Next.js 15 App Router
- Tailwind CSS v3
- Lucide React
- Inter, Cinzel, JetBrains Mono

**New:**
- `motion/react` (entry + scroll-reveal)
- `@dnd-kit/*` (admin reorder)

### Brand Tokens

Same as previous spec: dark theme, heritage gold accent, `rounded-xl`, `shadow-panel`.

### Typography

Same as previous spec. All landing page copy comes from config, but UI must enforce:
- Headline max 2 lines desktop
- Subtext max 200 chars
- Feature description max 500 chars

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

**Carousel crossfade:**
```tsx
<AnimatePresence mode="wait">
  <motion.img
    key={index}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  />
</AnimatePresence>
```

**Reduced motion:**
```tsx
const reduce = useReducedMotion();
// Disable auto-advance, instant transitions
```

---

## File Structure

```
apps/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma (updated)
│   └── src/
│       ├── landing-page/
│       │   ├── landing-page.module.ts
│       │   ├── landing-page.controller.ts
│       │   ├── landing-page.service.ts
│       │   └── dto/
│       │       ├── update-config.dto.ts
│       │       ├── create-feature.dto.ts
│       │       └── update-feature.dto.ts
│       └── common/
│           └── storage.ts (updated)
└── frontend/
    ├── app/
    │   └── (main)/
    │       ├── page.tsx (updated, dynamic landing)
    │       └── admin/
    │           └── settings/
    │               └── landing-page/
    │                   └── page.tsx
    └── components/
        └── landing/
            ├── LandingNav.tsx (updated)
            ├── Hero.tsx (updated with carousel)
            ├── Features.tsx (new, dynamic)
            ├── Gallery.tsx (new)
            ├── Footer.tsx (updated)
            ├── ImageCarousel.tsx (shared)
            └── SortableImageList.tsx (admin)
```

---

## Security

### Public API

- Only exposes published landing page content
- No `eventId`, no internal config IDs
- No admin-only fields
- `Cache-Control: public, max-age=30` (safe to cache)

### Admin API

- All endpoints guarded by `JwtAuthGuard`
- Only operates on active event config
- Upload endpoints validate file type and size
- Delete endpoints remove file from disk after DB delete

### Image Access

- Images served from `/api/uploads/landing/*`
- Existing static middleware handles access
- No directory listing

---

## Error States

| Component | Error | Fallback |
|-----------|-------|----------|
| Landing page | Public API fails | Show default static landing page with default copy |
| Hero carousel | Single image fails | Show next image |
| Feature images | Single image fails | Show placeholder |
| Admin page | API fetch fails | Show error alert, retry button |
| Upload | File too large / invalid type | Inline error message |

---

## Performance

### Core Web Vitals Targets

- LCP < 2.5s (hero first image priority-loaded)
- INP < 200ms (motion isolated, carousels paused on hover)
- CLS < 0.1 (all images use `aspect-ratio`)

### Image Optimization

- Use `next/image` where possible
- Hero images: `priority` + `sizes="(max-width: 768px) 100vw, 45vw"`
- Gallery images: lazy-loaded
- Feature images: lazy-loaded below fold

### Bundle

- `motion/react` lazy-loaded in Client Components
- `@dnd-kit` only loaded in admin page

---

## Testing Checklist

- [ ] Desktop landing page renders dynamic content
- [ ] Mobile landing page stacks correctly
- [ ] Hero carousel auto-rotates
- [ ] Feature carousels auto-rotate
- [ ] Gallery displays in masonry
- [ ] Admin page CRUD for features works
- [ ] Admin page upload/delete/reorder images works
- [ ] Section toggles hide/show landing page sections
- [ ] Reduced motion disables carousels
- [ ] Public API returns no admin data
- [ ] Admin API rejects unauthenticated requests
- [ ] Lighthouse: LCP < 2.5s, INP < 200ms, CLS < 0.1

---

## Pre-Flight Checklist

- [x] Brief inference declared
- [x] Dial values explicit (6/5/4)
- [x] Design system chosen (existing Tailwind v3 + brand tokens)
- [x] Redesign mode: revision of previous spec
- [x] ZERO em-dashes
- [x] Page Theme Lock: dark only
- [x] Color Consistency Lock: heritage gold accent
- [x] Shape Consistency Lock: rounded-xl (0.75rem)
- [x] Button Contrast Check: all CTAs pass WCAG AA
- [x] CTA Button Wrap: no wrapping at desktop
- [x] Serif discipline: Cinzel for headings only
- [x] Hero fits viewport
- [x] Hero top padding: pt-20 (max pt-24)
- [x] Hero stack discipline: max 4 text elements
- [x] Eyebrow count: 0
- [x] Split-Header Ban: no split-header pattern
- [x] Zigzag Alternation Cap: max 2 sections
- [x] No Duplicate CTA Intent
- [x] Bento Background Diversity: N/A (replaced by dynamic features + masonry gallery)
- [x] Logo wall = logo only (if rendered)
- [x] Copy Self-Audit: all strings reviewed
- [x] Motion motivated
- [x] Marquee max-one-per-page: 0 marquees
- [x] Navigation on ONE line, height 64px
- [x] Section-Layout-Repetition: 5 different families
- [x] Long lists: N/A
- [x] Real images: admin-uploaded
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
- [x] Content density sane
- [x] Motion claimed = motion shown
- [x] No window.addEventListener('scroll')
- [x] Reduced motion wrapped
- [x] Dark mode tokens defined
- [x] Mobile collapse explicit
- [x] Viewport stability: min-h-[100dvh]
- [x] Empty/loading/error states provided
- [x] Icons from Lucide
- [x] Motion isolated in client-leaf components
- [x] No AI Tells
- [x] Security: public API separated from admin API
- [x] No About button in footer

---

## Success Criteria

**Functional:**
- Landing page at `/` reads all content from public API
- Hero images auto-rotate
- Feature images auto-rotate
- Gallery section displays past event photos
- Admin can fully customize text, features, images, toggles
- About button removed from landing page footer

**Security:**
- Public API exposes no admin data
- Admin API requires JWT
- File uploads validated

**Quality:**
- Lighthouse performance > 90
- LCP < 2.5s, INP < 200ms, CLS < 0.1
- WCAG AA compliance

---

## Implementation Order

1. Prisma schema + migration
2. Backend `LandingPageModule` with service + controller
3. Storage function for landing page images
4. Admin UI page with forms + drag-and-drop
5. Public landing page components with carousels
6. Update TopNav/admin routing if needed
7. Testing + performance audit

---

**End of spec.**
