# Landing Page End-to-End Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every feature on `/admin/settings/landing-page` work correctly and reflect immediately on the public landing page (`/`).

**Architecture:** Keep the existing NestJS + Prisma backend and Next.js frontend structure. Fix the data contract between `GET /admin/landing-page` and the admin page, add missing error handling and state sync in the admin UI, and ensure the public landing page does not cache stale config.

**Tech Stack:** NestJS, Prisma, TypeScript, Next.js 15 (App Router), React, Tailwind CSS, `@dnd-kit`, `lucide-react`.

## Global Constraints

- Do not add new dependencies unless absolutely necessary.
- Follow existing file naming and folder conventions.
- Preserve existing public landing page design.
- All backend endpoints already require `JwtAuthGuard`; keep token handling as-is.
- Use exact existing DTOs unless a field is genuinely missing.
- Commit after every task.
- Tests must be runnable with existing scripts (`npm run build` for backend type-check; `jest`/`vitest` if available, otherwise small self-check scripts).

---

## File Map

| File | Responsibility |
|------|----------------|
| `apps/backend/src/landing-page/landing-page.service.ts` | Business logic for landing page config, images, features. |
| `apps/backend/src/landing-page/landing-page.controller.ts` | HTTP routes for public/admin landing page APIs. |
| `apps/backend/src/landing-page/dto/update-landing-config.dto.ts` | DTO for `PUT /admin/landing-page`. |
| `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx` | Admin settings UI. |
| `apps/frontend/components/landing/SortableImageList.tsx` | Reusable drag-drop image list. |
| `apps/frontend/app/page.tsx` | Public landing page. |
| `apps/frontend/components/landing/Features.tsx` | Public features section. |
| `apps/frontend/components/landing/Gallery.tsx` | Public gallery section. |
| `apps/backend/test/landing-page/landing-page.service.spec.ts` | New backend service tests. |
| `apps/frontend/__tests__/landing/SortableImageList.test.tsx` | New frontend component tests. |

---

## Task 1: Stabilize admin GET response shape

**Files:**
- Modify: `apps/backend/src/landing-page/landing-page.service.ts:118-139`
- Test: `apps/backend/test/landing-page/landing-page.service.spec.ts`

**Interfaces:**
- Consumes: Prisma `LandingPageConfig` with nested `heroImages`, `features` (with nested `images`), `galleryImages`.
- Produces: `{ config: LandingConfig, heroImages: HeroImage[], features: Feature[], galleryImages: GalleryImage[] }` matching the frontend `LandingPageAdminData` type.

### Why
`getAdminLandingPage` was returning the raw Prisma object. The admin page destructures `data.config`, `data.heroImages`, etc. Raw object caused `data.config` to be undefined and crashed on `config.showHero`.

### Steps

- [ ] **Step 1: Write failing test**

Create `apps/backend/test/landing-page/landing-page.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { LandingPageService } from '../../src/landing-page/landing-page.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EventsService } from '../../src/events/events.service';

describe('LandingPageService.getAdminLandingPage', () => {
  let service: LandingPageService;
  const mockEvent = { id: 'event-1' };

  const mockConfig = {
    id: 'cfg-1',
    eventId: 'event-1',
    heroHeadline: 'Headline',
    heroSubtext: 'Subtext',
    heroCtaPrimary: 'Primary',
    heroCtaSecondary: 'Secondary',
    galleryTitle: 'Gallery',
    gallerySubtext: 'Gallery sub',
    showHero: true,
    showFeatures: false,
    showGallery: true,
    showFooter: false,
    heroImages: [{ id: 'h1', url: '/api/uploads/landing/hero/a.jpg', alt: null, sortOrder: 0, intervalMs: 5000, configId: 'cfg-1', createdAt: new Date() }],
    features: [{ id: 'f1', title: 'Feature', description: 'Desc', sortOrder: 0, isActive: true, configId: 'cfg-1', createdAt: new Date(), updatedAt: new Date(), images: [] }],
    galleryImages: [{ id: 'g1', url: '/api/uploads/landing/gallery/b.jpg', alt: null, caption: null, sortOrder: 0, configId: 'cfg-1', createdAt: new Date() }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingPageService,
        {
          provide: PrismaService,
          useValue: {
            landingPageConfig: {
              findUnique: jest.fn().mockResolvedValue(mockConfig),
            },
          },
        },
        {
          provide: EventsService,
          useValue: {
            getActive: jest.fn().mockResolvedValue(mockEvent),
          },
        },
      ],
    }).compile();

    service = module.get<LandingPageService>(LandingPageService);
  });

  it('returns config in the shape the admin page expects', async () => {
    const data = await service.getAdminLandingPage();
    expect(data.config).toBeDefined();
    expect(data.config.showHero).toBe(true);
    expect(data.heroImages).toHaveLength(1);
    expect(data.features).toHaveLength(1);
    expect(data.galleryImages).toHaveLength(1);
    expect((data.config as any).id).toBeUndefined();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run:

```bash
npx jest apps/backend/test/landing-page/landing-page.service.spec.ts --no-coverage
```

Expected: FAIL because `getAdminLandingPage` currently returns raw Prisma object; `data.config` undefined in test assertion.

- [ ] **Step 3: Implement the mapping**

Modify `apps/backend/src/landing-page/landing-page.service.ts:118-139` to return the exact shape. Current code (after previous partial fix):

```typescript
async getAdminLandingPage() {
  const eventId = await this.getActiveEventId();
  const config = await this.getOrCreateConfig(eventId);

  return {
    config: {
      heroHeadline: config.heroHeadline,
      heroSubtext: config.heroSubtext,
      heroCtaPrimary: config.heroCtaPrimary,
      heroCtaSecondary: config.heroCtaSecondary,
      galleryTitle: config.galleryTitle,
      gallerySubtext: config.gallerySubtext,
      showHero: config.showHero,
      showFeatures: config.showFeatures,
      showGallery: config.showGallery,
      showFooter: config.showFooter,
    },
    heroImages: config.heroImages,
    features: config.features,
    galleryImages: config.galleryImages,
  };
}
```

This is already the correct mapping. If the test still fails, the issue is in Prisma query `findUnique` mock not matching `where: { eventId }` or missing `include`. Ensure `getOrCreateConfig` uses `findUnique({ where: { eventId }, include: {...} })`. If it does not in the current file, update `getOrCreateConfig` to include nested relations. The current file already includes them; if not, add the includes.

- [ ] **Step 4: Run backend build**

```bash
npm run build --prefix apps/backend
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/landing-page/landing-page.service.ts apps/backend/test/landing-page/landing-page.service.spec.ts
git commit -m "fix(backend): return correct admin landing page shape"
```

---

## Task 2: Add backend error logging for uploads and saves

**Files:**
- Modify: `apps/backend/src/landing-page/landing-page.controller.ts`
- Test: manual — trigger upload/save and check server logs.

**Interfaces:**
- Consumes: existing service methods.
- Produces: same HTTP responses, but errors are logged with context.

### Why
User reports "upload tidak ada response". If backend throws before returning, the error is swallowed by production build. Logging reveals the real failure.

### Steps

- [ ] **Step 1: Wrap controller methods with try/catch + logger**

Add a logger to the controller and log errors for every mutating endpoint. Example change in `apps/backend/src/landing-page/landing-page.controller.ts`:

```typescript
import { Controller, Get, Put, Post, Delete, Param, Body, UploadedFile, UseGuards, UseInterceptors, Res, BadRequestException, Logger } from '@nestjs/common';

@Controller()
export class LandingPageController {
  private readonly logger = new Logger(LandingPageController.name);

  constructor(private readonly landingPage: LandingPageService) {}

  // ...existing endpoints...

  @UseGuards(JwtAuthGuard)
  @Post('admin/landing-page/hero-image')
  async uploadHeroImage(@UploadedFile() file: Express.Multer.File, @Body('alt') alt?: string) {
    try {
      return await this.landingPage.uploadHeroImage(file, alt);
    } catch (error) {
      this.logger.error(`uploadHeroImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

Repeat for: `uploadFeatureImage`, `uploadGalleryImage`, `updateConfig`, `createFeature`, `updateFeature`, `deleteFeature`, and image/feature delete/reorder endpoints.

- [ ] **Step 2: Type-check**

```bash
npm run build --prefix apps/backend
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/landing-page/landing-page.controller.ts
git commit -m "chore(backend): add error logging to landing page mutations"
```

---

## Task 3: Sync SortableImageList with props

**Files:**
- Modify: `apps/frontend/components/landing/SortableImageList.tsx`
- Test: `apps/frontend/__tests__/landing/SortableImageList.test.tsx`

**Interfaces:**
- Consumes: `images: SortableImage[]` prop.
- Produces: drag-drop UI that updates when parent state changes.

### Why
`localImages` is initialized once from `images` but never updated when `images` prop changes (e.g., after refetch or upload from parent). The list becomes stale.

### Steps

- [ ] **Step 1: Write failing test**

Create `apps/frontend/__tests__/landing/SortableImageList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import SortableImageList from '@/components/landing/SortableImageList';

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: undefined,
  }),
  sortableKeyboardCoordinates: jest.fn(),
  rectSortingStrategy: jest.fn(),
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: jest.fn(() => '') } },
}));

describe('SortableImageList', () => {
  it('updates rendered list when images prop changes', () => {
    const { rerender } = render(
      <SortableImageList
        images={[{ id: '1', url: '/a.jpg' }]}
        onReorder={jest.fn()}
        onDelete={jest.fn()}
        onUpload={jest.fn()}
      />
    );

    expect(screen.getAllByRole('img')).toHaveLength(1);

    rerender(
      <SortableImageList
        images={[{ id: '1', url: '/a.jpg' }, { id: '2', url: '/b.jpg' }]}
        onReorder={jest.fn()}
        onDelete={jest.fn()}
        onUpload={jest.fn()}
      />
    );

    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
});
```

If testing framework is not installed, use a small self-check component render script with `react-dom/server` instead.

- [ ] **Step 2: Verify test fails**

Run test. Expected: second assertion fails because list stays at length 1.

- [ ] **Step 3: Add effect to sync localImages**

Modify `apps/frontend/components/landing/SortableImageList.tsx`:

```typescript
import { useState, useEffect } from 'react';

// inside component:
const [localImages, setLocalImages] = useState(images);

useEffect(() => {
  setLocalImages(images);
}, [images]);
```

- [ ] **Step 4: Run test and type-check**

```bash
cd apps/frontend && npx jest __tests__/landing/SortableImageList.test.tsx --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/landing/SortableImageList.tsx apps/frontend/__tests__/landing/SortableImageList.test.tsx
git commit -m "fix(frontend): sync SortableImageList when images prop changes"
```

---

## Task 4: Wire upload/delete error feedback in admin page

**Files:**
- Modify: `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx`

**Interfaces:**
- Consumes: `setError`, `setMessage`, `setHeroImages`, `setFeatures`, `setGalleryImages`.
- Produces: user-facing messages on upload/delete failure.

### Why
Currently upload errors are unhandled and delete handlers do not update local state, so deleted images remain visible.

### Steps

- [ ] **Step 1: Wrap upload handlers with try/catch and messages**

Replace `handleUploadHeroImage` in `page.tsx`:

```typescript
const handleUploadHeroImage = async (file: File) => {
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res = await fetch(`${apiBase()}/admin/landing-page/hero-image`, {
      method: 'POST',
      headers: tokenHeader(),
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    const newImage = await res.json();
    setHeroImages(prev => [...prev, newImage]);
    setMessage('Gambar hero diupload.');
  } catch (e: any) {
    setError(e.message);
  }
};
```

Do the same for `handleUploadFeatureImage` and `handleUploadGalleryImage`.

- [ ] **Step 2: Update delete handlers to remove from local state**

Replace `handleDeleteHeroImage`:

```typescript
const handleDeleteHeroImage = async (imageId: string) => {
  try {
    const res = await fetch(`${apiBase()}/admin/landing-page/hero-image/${imageId}`, {
      method: 'DELETE',
      headers: tokenHeader(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(parseErrorMessage(text));
    }
    setHeroImages(prev => prev.filter(img => img.id !== imageId));
    setMessage('Gambar hero dihapus.');
  } catch (e: any) {
    setError(e.message);
  }
};
```

Do the same for `handleDeleteGalleryImage`.

- [ ] **Step 3: Ensure feature delete removes from state**

`handleDeleteFeature` already does `setFeatures(prev => prev.filter(...))`. Add try/catch/message.

- [ ] **Step 4: Type-check frontend**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/settings/landing-page/page.tsx
git commit -m "fix(frontend): handle upload/delete errors and state updates"
```

---

## Task 5: Sync FeatureCard local state with prop changes

**Files:**
- Modify: `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx:625-740`

**Interfaces:**
- Consumes: `feature` prop.
- Produces: controlled inputs that stay in sync when parent refetches/updates.

### Why
`FeatureCard` copies `feature.title`, `feature.description`, `feature.isActive` into local state on first render. If the parent updates the feature (e.g., after re-order or save), the card shows stale values.

### Steps

- [ ] **Step 1: Add effect to sync local state**

Inside `FeatureCard` component, after state declarations:

```typescript
useEffect(() => {
  setTitle(feature.title);
  setDescription(feature.description);
  setIsActive(feature.isActive);
}, [feature.title, feature.description, feature.isActive]);
```

Add `useEffect` import if not already present.

- [ ] **Step 2: Type-check**

```bash
cd apps/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/settings/landing-page/page.tsx
git commit -m "fix(frontend): keep FeatureCard state in sync with props"
```

---

## Task 6: Disable public landing page caching

**Files:**
- Modify: `apps/backend/src/landing-page/landing-page.controller.ts:33-38`
- Modify: `apps/frontend/app/page.tsx`

**Interfaces:**
- Consumes: `GET /public/landing-page`.
- Produces: fresh data on every landing page request.

### Why
Backend sets `Cache-Control: public, max-age=30`. Next.js server components may cache this, so changes appear delayed. Also the server component itself has no revalidation.

### Steps

- [ ] **Step 1: Change backend cache header**

In `apps/backend/src/landing-page/landing-page.controller.ts`:

```typescript
@Get('public/landing-page')
async getPublicLandingPage(@Res() res: Response) {
  const data = await this.landingPage.getPublicLandingPage();
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.json(data);
}
```

- [ ] **Step 2: Add dynamic rendering hint in frontend**

At the top of `apps/frontend/app/page.tsx`, add:

```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

This tells Next.js not to statically cache the page.

- [ ] **Step 3: Type-check both sides**

```bash
npm run build --prefix apps/backend
cd apps/frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/landing-page/landing-page.controller.ts apps/frontend/app/page.tsx
git commit -m "fix(landing-page): serve fresh public landing data"
```

---

## Task 7: Add missing feature section title/subtext fields (optional)

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: Prisma migration
- Modify: `apps/backend/src/landing-page/dto/update-landing-config.dto.ts`
- Modify: `apps/backend/src/landing-page/landing-page.service.ts`
- Modify: `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx`
- Modify: `apps/frontend/components/landing/Features.tsx`

**Interfaces:**
- Consumes: `featureSectionTitle`, `featureSectionSubtext` config values.
- Produces: rendered section header on public landing page.

### Why
The admin page originally had inputs for these fields, but they were removed in the previous fix because the database did not store them. If the product owner wants a section title above features, these fields are needed.

### Steps

- [ ] **Step 1: Add columns to Prisma schema**

In `apps/backend/prisma/schema.prisma`, inside `model LandingPageConfig`, add:

```prisma
  featureSectionTitle   String   @default("Why Attend?")
  featureSectionSubtext String   @default("Discover what makes this event special")
```

- [ ] **Step 2: Generate migration**

```bash
cd apps/backend && npx prisma migrate dev --name add_feature_section_copy
```

- [ ] **Step 3: Add DTO fields**

In `apps/backend/src/landing-page/dto/update-landing-config.dto.ts`, add:

```typescript
@IsOptional()
@IsString()
@MaxLength(200)
featureSectionTitle?: string;

@IsOptional()
@IsString()
@MaxLength(400)
featureSectionSubtext?: string;
```

- [ ] **Step 4: Return fields from backend**

In `getPublicLandingPage` and `getAdminLandingPage`, include the two fields in `config`.

- [ ] **Step 5: Restore admin inputs**

In `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx`:
- Add `featureSectionTitle` and `featureSectionSubtext` to `LandingConfig` interface and `DEFAULT_CONFIG`.
- Restore the two inputs under the Features section.

- [ ] **Step 6: Render on public page**

Update `Features.tsx` to accept and render `title` and `subtext` props.

Update `app/page.tsx` to pass `landingData?.featuresTitle` etc. You may choose to put the title inside the existing `features` object or as top-level fields. Pick one and keep it consistent.

- [ ] **Step 7: Type-check and migrate production**

```bash
npm run build --prefix apps/backend
cd apps/backend && npx prisma migrate deploy
cd apps/frontend && npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/ apps/backend/src/landing-page/ apps/frontend/app/\(main\)/admin/settings/landing-page/page.tsx apps/frontend/components/landing/Features.tsx apps/frontend/app/page.tsx
git commit -m "feat(landing-page): add feature section title and subtext"
```

---

## Task 8: Final integration test

**Files:**
- Manual test in browser.

**Steps:**

- [ ] **Step 1: Start backend**

```bash
cd apps/backend && npm run dev
```

- [ ] **Step 2: Start frontend**

```bash
cd apps/frontend && npm run dev
```

- [ ] **Step 3: Open `/admin/settings/landing-page`**

Verify:
- Page loads without crash.
- Toggle visibility, click Simpan, see success message.
- Refresh page; toggles persist.

- [ ] **Step 4: Upload hero/gallery/feature images**

Verify:
- Image appears in admin list.
- Network tab shows 200 response.
- Backend logs show no errors.

- [ ] **Step 5: Open `/` landing page**

Verify:
- Hero section shows when `showHero` true.
- Features section shows when active features exist and `showFeatures` true.
- Gallery section shows when images exist and `showGallery` true.
- Changes reflect immediately after save (no 30-second cache).

- [ ] **Step 6: Delete images/features**

Verify item disappears from admin and public pages.

- [ ] **Step 7: Commit any remaining changes**

---

## Self-Review

**Spec coverage:**
- Admin GET shape fix → Task 1.
- Upload/save no response/error → Tasks 2 and 4.
- Landing page not changing → Tasks 2, 4, 6.
- Features/gallery not appearing → Tasks 3, 4, 5, 6 (and optional Task 7 for section title).

**Placeholder scan:** No TBD/placeholder steps. Code blocks provided.

**Type consistency:** `LandingConfig` in frontend and backend `config` object use same field names. Optional Task 7 adds two fields consistently.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-30-landing-page-end-to-end-fix.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
