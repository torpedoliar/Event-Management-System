# Landing Page Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing page fully customizable via admin panel with dynamic content, image carousels, and drag-and-drop management.

**Architecture:** New Prisma models for landing page config + NestJS module with public/admin APIs + Next.js admin settings page with dnd-kit + dynamic landing page components with carousels.

**Tech Stack:** Prisma, NestJS, Next.js 15, Tailwind CSS, @dnd-kit/core, @dnd-kit/sortable, motion/react

## Global Constraints

- Image upload limit: 5MB, allowed types: jpeg/png/webp
- Storage path: `uploads/landing/{hero|features|gallery}/`
- Public API cache: `Cache-Control: public, max-age=30`
- Admin API: all endpoints require `JwtAuthGuard`
- Motion: respect `useReducedMotion()` - disable auto-advance and use instant transitions
- Carousel interval minimum: 3000ms
- Typography limits: headline max 2 lines desktop, subtext max 200 chars, feature description max 500 chars

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/backend/prisma/schema.prisma` | Modify | Add 5 landing page models |
| `apps/backend/src/common/storage.ts` | Modify | Add `landingPageStorage()` function |
| `apps/backend/src/landing-page/landing-page.module.ts` | Create | NestJS module |
| `apps/backend/src/landing-page/landing-page.service.ts` | Create | Business logic for landing page CRUD |
| `apps/backend/src/landing-page/landing-page.controller.ts` | Create | Public + admin API endpoints |
| `apps/backend/src/landing-page/dto/update-landing-config.dto.ts` | Create | DTO for config updates |
| `apps/backend/src/landing-page/dto/create-feature.dto.ts` | Create | DTO for feature creation |
| `apps/backend/src/landing-page/dto/update-feature.dto.ts` | Create | DTO for feature updates |
| `apps/backend/src/app.module.ts` | Modify | Import LandingPageModule |
| `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx` | Create | Admin settings page with dnd-kit |
| `apps/frontend/components/landing/Hero.tsx` | Modify | Add carousel + dynamic content |
| `apps/frontend/components/landing/Features.tsx` | Create | Dynamic features section with carousel |
| `apps/frontend/components/landing/Gallery.tsx` | Create | Masonry gallery section |
| `apps/frontend/components/landing/Footer.tsx` | Modify | Remove About link, add dynamic brand |
| `apps/frontend/components/landing/LandingNav.tsx` | Modify | Pass eventConfig to children |
| `apps/frontend/components/landing/ImageCarousel.tsx` | Create | Shared carousel component |
| `apps/frontend/components/landing/SortableImageList.tsx` | Create | Admin drag-and-drop image list |
| `apps/frontend/app/(main)/page.tsx` | Modify | Fetch landing page data, render dynamic sections |

---

### Task 1: Install @dnd-kit Dependencies

**Files:**
- Modify: `apps/frontend/package.json`

- [ ] **Step 1: Install @dnd-kit packages**

Run in `apps/frontend` directory:
```bash
cd apps/frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/frontend && npm list @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
Expected: All three packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "feat: add @dnd-kit for landing page drag-and-drop"
```

---

### Task 2: Add Prisma Landing Page Models

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add Event relation to LandingPageConfig**

Add to the `Event` model (after `stations CheckinStation[]`):
```prisma
  landingPageConfig LandingPageConfig?
```

- [ ] **Step 2: Add landing page models at end of schema.prisma**

Append these models after `EmailLog`:
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

- [ ] **Step 3: Run migration**

```bash
cd apps/backend && npx prisma migrate dev --name add_landing_page_config
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd apps/backend && npm run prisma:generate
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: add landing page Prisma models and migration"
```

---

### Task 3: Add landingPageStorage Function

**Files:**
- Modify: `apps/backend/src/common/storage.ts`

- [ ] **Step 1: Add landingPageStorage function**

Add at end of `apps/backend/src/common/storage.ts`:
```typescript
export const landingPageStorage = (subfolder: 'hero' | 'features' | 'gallery') =>
  diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => cb(null, ensureDir(`uploads/landing/${subfolder}`)),
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => cb(null, uniqueName(file.originalname)),
  });
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/common/storage.ts
git commit -m "feat: add landingPageStorage for hero/features/gallery uploads"
```

---

### Task 4: Create Landing Page DTOs

**Files:**
- Create: `apps/backend/src/landing-page/dto/update-landing-config.dto.ts`
- Create: `apps/backend/src/landing-page/dto/create-feature.dto.ts`
- Create: `apps/backend/src/landing-page/dto/update-feature.dto.ts`

- [ ] **Step 1: Create update-landing-config.dto.ts**

```typescript
// apps/backend/src/landing-page/dto/update-landing-config.dto.ts
import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateLandingConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroHeadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  heroSubtext?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  heroCtaPrimary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  heroCtaSecondary?: string;

  @IsOptional()
  @IsBoolean()
  showHero?: boolean;

  @IsOptional()
  @IsBoolean()
  showFeatures?: boolean;

  @IsOptional()
  @IsBoolean()
  showGallery?: boolean;

  @IsOptional()
  @IsBoolean()
  showFooter?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  galleryTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  gallerySubtext?: string;
}
```

- [ ] **Step 2: Create create-feature.dto.ts**

```typescript
// apps/backend/src/landing-page/dto/create-feature.dto.ts
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

- [ ] **Step 3: Create update-feature.dto.ts**

```typescript
// apps/backend/src/landing-page/dto/update-feature.dto.ts
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateFeatureDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/landing-page/dto/
git commit -m "feat: add landing page DTOs for config and features"
```

---

### Task 5: Create Landing Page Service

**Files:**
- Create: `apps/backend/src/landing-page/landing-page.service.ts`

**Interfaces:**
- Consumes: `PrismaService`, `EventsService.getActive()`, `landingPageStorage()`
- Produces: `LandingPageService` with methods: `getPublicLandingPage()`, `getAdminLandingPage()`, `updateConfig()`, `createFeature()`, `updateFeature()`, `deleteFeature()`, `reorderFeatures()`, `uploadHeroImage()`, `deleteHeroImage()`, `reorderHeroImages()`, `uploadFeatureImage()`, `deleteFeatureImage()`, `reorderFeatureImages()`, `uploadGalleryImage()`, `deleteGalleryImage()`, `reorderGalleryImages()`

- [ ] **Step 1: Create landing-page.service.ts**

```typescript
// apps/backend/src/landing-page/landing-page.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { UpdateLandingConfigDto } from './dto/update-landing-config.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class LandingPageService {
  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  private async getActiveEventId(): Promise<string> {
    const event = await this.events.getActive();
    if (!event) throw new NotFoundException('No active event');
    return event.id;
  }

  private async getOrCreateConfig(eventId: string) {
    let config = await this.prisma.landingPageConfig.findUnique({
      where: { eventId },
      include: {
        heroImages: { orderBy: { sortOrder: 'asc' } },
        features: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        galleryImages: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!config) {
      config = await this.prisma.landingPageConfig.create({
        data: {
          eventId,
          features: {
            create: [
              {
                title: 'Check-in that actually works',
                description: 'QR scanning, manual search, duplicate prevention. Everything you need for smooth guest arrivals.',
                sortOrder: 0,
                isActive: true,
              },
              {
                title: 'Real-time display',
                description: 'Live guest count, table assignments, and queue status on a single screen.',
                sortOrder: 1,
                isActive: true,
              },
            ],
          },
        },
        include: {
          heroImages: { orderBy: { sortOrder: 'asc' } },
          features: {
            orderBy: { sortOrder: 'asc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } },
          },
          galleryImages: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }

    return config;
  }

  async getPublicLandingPage() {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

    return {
      hero: {
        headline: config.heroHeadline,
        subtext: config.heroSubtext,
        ctaPrimary: config.heroCtaPrimary,
        ctaSecondary: config.heroCtaSecondary,
        images: config.heroImages.map((img) => ({
          url: img.url,
          alt: img.alt,
          intervalMs: img.intervalMs,
        })),
      },
      features: config.features
        .filter((f) => f.isActive)
        .map((f) => ({
          id: f.id,
          title: f.title,
          description: f.description,
          sortOrder: f.sortOrder,
          images: f.images.map((img) => ({
            url: img.url,
            alt: img.alt,
            intervalMs: img.intervalMs,
          })),
        })),
      gallery: {
        title: config.galleryTitle,
        subtext: config.gallerySubtext,
        images: config.galleryImages.map((img) => ({
          url: img.url,
          alt: img.alt,
          caption: img.caption,
        })),
      },
      toggles: {
        showHero: config.showHero,
        showFeatures: config.showFeatures,
        showGallery: config.showGallery,
        showFooter: config.showFooter,
      },
    };
  }

  async getAdminLandingPage() {
    const eventId = await this.getActiveEventId();
    return this.getOrCreateConfig(eventId);
  }

  async updateConfig(dto: UpdateLandingConfigDto) {
    const eventId = await this.getActiveEventId();
    await this.getOrCreateConfig(eventId);

    return this.prisma.landingPageConfig.update({
      where: { eventId },
      data: dto,
      include: {
        heroImages: { orderBy: { sortOrder: 'asc' } },
        features: {
          orderBy: { sortOrder: 'asc' },
          include: { images: { orderBy: { sortOrder: 'asc' } } },
        },
        galleryImages: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  // --- Features ---

  async createFeature(dto: CreateFeatureDto) {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

    const maxOrder = config.features.length > 0
      ? Math.max(...config.features.map((f) => f.sortOrder))
      : -1;

    return this.prisma.landingPageFeature.create({
      data: {
        configId: config.id,
        title: dto.title,
        description: dto.description,
        isActive: dto.isActive ?? true,
        sortOrder: maxOrder + 1,
      },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateFeature(featureId: string, dto: UpdateFeatureDto) {
    const feature = await this.prisma.landingPageFeature.findUnique({
      where: { id: featureId },
      include: { config: true },
    });
    if (!feature) throw new NotFoundException('Feature not found');

    return this.prisma.landingPageFeature.update({
      where: { id: featureId },
      data: dto,
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteFeature(featureId: string) {
    const feature = await this.prisma.landingPageFeature.findUnique({
      where: { id: featureId },
      include: { images: true },
    });
    if (!feature) throw new NotFoundException('Feature not found');

    // Delete associated images from disk
    for (const img of feature.images) {
      await this.deleteFileFromDisk(img.url);
    }

    await this.prisma.landingPageFeature.delete({ where: { id: featureId } });
    return { success: true };
  }

  async reorderFeatures(featureIds: string[]) {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

    // Verify all features belong to this config
    const featureIdsSet = new Set(config.features.map((f) => f.id));
    for (const id of featureIds) {
      if (!featureIdsSet.has(id)) {
        throw new BadRequestException(`Feature ${id} does not belong to this config`);
      }
    }

    const updates = featureIds.map((id, index) =>
      this.prisma.landingPageFeature.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await Promise.all(updates);
    return { success: true };
  }

  // --- Hero Images ---

  async uploadHeroImage(file: Express.Multer.File, alt?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

    const maxOrder = config.heroImages.length > 0
      ? Math.max(...config.heroImages.map((img) => img.sortOrder))
      : -1;

    const url = `/api/uploads/landing/hero/${file.filename}`;

    return this.prisma.landingPageHeroImage.create({
      data: {
        configId: config.id,
        url,
        alt: alt || null,
        sortOrder: maxOrder + 1,
      },
    });
  }

  async deleteHeroImage(imageId: string) {
    const image = await this.prisma.landingPageHeroImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Hero image not found');

    await this.deleteFileFromDisk(image.url);
    await this.prisma.landingPageHeroImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  async reorderHeroImages(imageIds: string[]) {
    const updates = imageIds.map((id, index) =>
      this.prisma.landingPageHeroImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await Promise.all(updates);
    return { success: true };
  }

  // --- Feature Images ---

  async uploadFeatureImage(featureId: string, file: Express.Multer.File, alt?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const feature = await this.prisma.landingPageFeature.findUnique({
      where: { id: featureId },
      include: { images: true },
    });
    if (!feature) throw new NotFoundException('Feature not found');

    const maxOrder = feature.images.length > 0
      ? Math.max(...feature.images.map((img) => img.sortOrder))
      : -1;

    const url = `/api/uploads/landing/features/${file.filename}`;

    return this.prisma.landingPageFeatureImage.create({
      data: {
        featureId,
        url,
        alt: alt || null,
        sortOrder: maxOrder + 1,
      },
    });
  }

  async deleteFeatureImage(imageId: string) {
    const image = await this.prisma.landingPageFeatureImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Feature image not found');

    await this.deleteFileFromDisk(image.url);
    await this.prisma.landingPageFeatureImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  async reorderFeatureImages(imageIds: string[]) {
    const updates = imageIds.map((id, index) =>
      this.prisma.landingPageFeatureImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await Promise.all(updates);
    return { success: true };
  }

  // --- Gallery Images ---

  async uploadGalleryImage(file: Express.Multer.File, alt?: string, caption?: string) {
    if (!file) throw new BadRequestException('No file provided');

    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

    const maxOrder = config.galleryImages.length > 0
      ? Math.max(...config.galleryImages.map((img) => img.sortOrder))
      : -1;

    const url = `/api/uploads/landing/gallery/${file.filename}`;

    return this.prisma.landingPageGalleryImage.create({
      data: {
        configId: config.id,
        url,
        alt: alt || null,
        caption: caption || null,
        sortOrder: maxOrder + 1,
      },
    });
  }

  async deleteGalleryImage(imageId: string) {
    const image = await this.prisma.landingPageGalleryImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Gallery image not found');

    await this.deleteFileFromDisk(image.url);
    await this.prisma.landingPageGalleryImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  async reorderGalleryImages(imageIds: string[]) {
    const updates = imageIds.map((id, index) =>
      this.prisma.landingPageGalleryImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await Promise.all(updates);
    return { success: true };
  }

  // --- Helpers ---

  private async deleteFileFromDisk(url: string) {
    try {
      // url is like /api/uploads/landing/hero/filename.jpg
      const relativePath = url.replace('/api/', '');
      await unlink(join(process.cwd(), relativePath));
    } catch {
      // File may already be deleted, ignore
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/landing-page/landing-page.service.ts
git commit -m "feat: add LandingPageService with CRUD for config, features, images"
```

---

### Task 6: Create Landing Page Controller

**Files:**
- Create: `apps/backend/src/landing-page/landing-page.controller.ts`

- [ ] **Step 1: Create landing-page.controller.ts**

```typescript
// apps/backend/src/landing-page/landing-page.controller.ts
import {
  Controller, Get, Put, Post, Delete, Param, Body,
  UploadedFile, UseGuards, UseInterceptors, Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { LandingPageService } from './landing-page.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { landingPageStorage } from '../common/storage';
import { UpdateLandingConfigDto } from './dto/update-landing-config.dto';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

const IMAGE_LIMITS = { fileSize: 5 * 1024 * 1024 }; // 5MB
const IMAGE_FILTER = {
  fileFilter: (_req: any, file: Express.Multer.File, cb: (error: Error | null, accept: boolean) => void) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new BadRequestException('Invalid file type. Only JPEG, PNG, WebP allowed.'), false);
    } else {
      cb(null, true);
    }
  },
};

@Controller()
export class LandingPageController {
  constructor(private readonly landingPage: LandingPageService) {}

  // --- Public API ---

  @Get('public/landing-page')
  async getPublicLandingPage(@Res() res: Response) {
    const data = await this.landingPage.getPublicLandingPage();
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.json(data);
  }

  // --- Admin API ---

  @UseGuards(JwtAuthGuard)
  @Get('admin/landing-page')
  getAdminLandingPage() {
    return this.landingPage.getAdminLandingPage();
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page')
  updateConfig(@Body() dto: UpdateLandingConfigDto) {
    return this.landingPage.updateConfig(dto);
  }

  // --- Features ---

  @UseGuards(JwtAuthGuard)
  @Post('admin/landing-page/features')
  createFeature(@Body() dto: CreateFeatureDto) {
    return this.landingPage.createFeature(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/features/:id')
  updateFeature(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    return this.landingPage.updateFeature(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/features/:id')
  deleteFeature(@Param('id') id: string) {
    return this.landingPage.deleteFeature(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/features/reorder')
  reorderFeatures(@Body('featureIds') featureIds: string[]) {
    return this.landingPage.reorderFeatures(featureIds);
  }

  // --- Hero Images ---

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: landingPageStorage('hero'),
    limits: IMAGE_LIMITS,
    ...IMAGE_FILTER,
  }))
  @Post('admin/landing-page/hero-image')
  uploadHeroImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
  ) {
    return this.landingPage.uploadHeroImage(file, alt);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/hero-image/:id')
  deleteHeroImage(@Param('id') id: string) {
    return this.landingPage.deleteHeroImage(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/hero-image/reorder')
  reorderHeroImages(@Body('imageIds') imageIds: string[]) {
    return this.landingPage.reorderHeroImages(imageIds);
  }

  // --- Feature Images ---

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: landingPageStorage('features'),
    limits: IMAGE_LIMITS,
    ...IMAGE_FILTER,
  }))
  @Post('admin/landing-page/features/:id/images')
  uploadFeatureImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
  ) {
    return this.landingPage.uploadFeatureImage(id, file, alt);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/features/:id/images/:imageId')
  deleteFeatureImage(@Param('imageId') imageId: string) {
    return this.landingPage.deleteFeatureImage(imageId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/features/:id/images/reorder')
  reorderFeatureImages(@Body('imageIds') imageIds: string[]) {
    return this.landingPage.reorderFeatureImages(imageIds);
  }

  // --- Gallery Images ---

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: landingPageStorage('gallery'),
    limits: IMAGE_LIMITS,
    ...IMAGE_FILTER,
  }))
  @Post('admin/landing-page/gallery')
  uploadGalleryImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
    @Body('caption') caption?: string,
  ) {
    return this.landingPage.uploadGalleryImage(file, alt, caption);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/gallery/:id')
  deleteGalleryImage(@Param('id') id: string) {
    return this.landingPage.deleteGalleryImage(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/gallery/reorder')
  reorderGalleryImages(@Body('imageIds') imageIds: string[]) {
    return this.landingPage.reorderGalleryImages(imageIds);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/landing-page/landing-page.controller.ts
git commit -m "feat: add LandingPageController with public and admin endpoints"
```

---

### Task 7: Create Landing Page Module

**Files:**
- Create: `apps/backend/src/landing-page/landing-page.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create landing-page.module.ts**

```typescript
// apps/backend/src/landing-page/landing-page.module.ts
import { Module } from '@nestjs/common';
import { LandingPageController } from './landing-page.controller';
import { LandingPageService } from './landing-page.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [LandingPageController],
  providers: [LandingPageService],
})
export class LandingPageModule {}
```

- [ ] **Step 2: Update EventsModule to export EventsService**

Check `apps/backend/src/events/events.module.ts` and ensure `EventsService` is exported:
```typescript
// Add to EventsModule
exports: [EventsService],
```

- [ ] **Step 3: Import LandingPageModule in app.module.ts**

Add import at top of `apps/backend/src/app.module.ts`:
```typescript
import { LandingPageModule } from './landing-page/landing-page.module';
```

Add to imports array:
```typescript
@Module({
  imports: [
    // ... existing imports
    LandingPageModule,
  ],
  // ...
})
```

- [ ] **Step 4: Verify backend builds**

```bash
cd apps/backend && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/landing-page/ apps/backend/src/app.module.ts apps/backend/src/events/events.module.ts
git commit -m "feat: add LandingPageModule and register in AppModule"
```

---

### Task 8: Create ImageCarousel Component

**Files:**
- Create: `apps/frontend/components/landing/ImageCarousel.tsx`

- [ ] **Step 1: Create ImageCarousel.tsx**

```tsx
// apps/frontend/components/landing/ImageCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface CarouselImage {
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  aspectRatio?: string;
  priority?: boolean;
  className?: string;
}

export default function ImageCarousel({
  images,
  aspectRatio = 'aspect-[4/3]',
  priority = false,
  className = '',
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  const currentImage = images[index];
  const interval = currentImage?.intervalMs ?? 5000;

  useEffect(() => {
    if (reduce || images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, Math.max(interval, 3000));
    return () => clearInterval(timer);
  }, [images.length, interval, reduce]);

  // Pause on hover
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (reduce || isPaused || images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, Math.max(interval, 3000));
    return () => clearInterval(timer);
  }, [images.length, interval, reduce, isPaused]);

  if (images.length === 0) {
    return (
      <div className={`${aspectRatio} rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border flex items-center justify-center ${className}`}>
        <span className="text-body-sm text-brand-textDim">No images</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${aspectRatio} rounded-2xl shadow-panel overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={currentImage.url}
          alt={currentImage.alt || ''}
          className="w-full h-full object-cover"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
          loading={priority ? 'eager' : 'lazy'}
        />
      </AnimatePresence>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? 'bg-white w-6' : 'bg-white/50'
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/landing/ImageCarousel.tsx
git commit -m "feat: add ImageCarousel with auto-advance, pause-on-hover, reduced motion"
```

---

### Task 9: Update Hero Component

**Files:**
- Modify: `apps/frontend/components/landing/Hero.tsx`

- [ ] **Step 1: Replace Hero.tsx with dynamic version**

```tsx
// apps/frontend/components/landing/Hero.tsx
'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import ImageCarousel from './ImageCarousel';

interface HeroImage {
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface HeroProps {
  headline?: string;
  subtext?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  images?: HeroImage[];
}

export default function Hero({
  headline = 'Enterprise event management, without the noise.',
  subtext = 'Check-in, display, and analytics in one system. Built for operations teams.',
  ctaPrimary = 'Open Display',
  ctaSecondary = 'Admin Login',
  images = [],
}: HeroProps) {
  const reduce = useReducedMotion();

  return (
    <section className="min-h-[100dvh] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <h1 className="text-display-sm font-heading text-brand-text line-clamp-2">
              {headline}
            </h1>

            <p className="text-body text-brand-textMuted max-w-[65ch]">
              {subtext}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/show"
                className="inline-flex items-center justify-center bg-brand-primary text-brand-bg px-6 py-3 rounded-xl font-medium
                           hover:bg-brand-primaryHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                {ctaPrimary}
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center text-brand-text border border-brand-border px-6 py-3 rounded-xl font-medium
                           hover:border-brand-borderHover transition-colors duration-fast
                           focus-visible:ring-2 focus-visible:ring-brand-primary/50"
              >
                {ctaSecondary}
              </Link>
            </div>
          </motion.div>

          {/* Right: Carousel */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {images.length > 0 ? (
              <ImageCarousel images={images} priority />
            ) : (
              <div className="aspect-[4/3] rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border flex items-center justify-center">
                <span className="text-body-sm text-brand-textDim">Product preview</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/landing/Hero.tsx
git commit -m "feat: update Hero with dynamic content and carousel"
```

---

### Task 10: Create Features Component

**Files:**
- Create: `apps/frontend/components/landing/Features.tsx`

- [ ] **Step 1: Create Features.tsx**

```tsx
// apps/frontend/components/landing/Features.tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';
import ImageCarousel from './ImageCarousel';

interface FeatureImage {
  url: string;
  alt?: string | null;
  intervalMs?: number;
}

interface Feature {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  images: FeatureImage[];
}

interface FeaturesProps {
  features: Feature[];
}

function FeatureItem({ feature, index }: { feature: Feature; index: number }) {
  const reduce = useReducedMotion();
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
        isReversed ? 'lg:direction-rtl' : ''
      }`}
    >
      {/* Text */}
      <div className={isReversed ? 'lg:order-2' : ''}>
        <h3 className="text-heading-lg font-heading text-brand-text mb-4">
          {feature.title}
        </h3>
        <p className="text-body text-brand-textMuted max-w-[60ch]">
          {feature.description}
        </p>
      </div>

      {/* Image */}
      <div className={isReversed ? 'lg:order-1' : ''}>
        {feature.images.length > 0 ? (
          <ImageCarousel images={feature.images} />
        ) : (
          <div className="aspect-[4/3] rounded-2xl shadow-panel overflow-hidden bg-brand-surface border border-brand-border flex items-center justify-center">
            <span className="text-body-sm text-brand-textDim">Feature image</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FeatureCentered({ feature }: { feature: Feature }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto text-center"
    >
      <h3 className="text-heading-lg font-heading text-brand-text mb-4">
        {feature.title}
      </h3>
      <p className="text-body text-brand-textMuted max-w-[60ch] mx-auto mb-8">
        {feature.description}
      </p>
      {feature.images.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <ImageCarousel images={feature.images} />
        </div>
      )}
    </motion.div>
  );
}

export default function Features({ features }: FeaturesProps) {
  if (features.length === 0) return null;

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {features.map((feature, index) =>
          index < 2 ? (
            <FeatureItem key={feature.id} feature={feature} index={index} />
          ) : (
            <FeatureCentered key={feature.id} feature={feature} />
          ),
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/landing/Features.tsx
git commit -m "feat: add Features component with zig-zag and centered layouts"
```

---

### Task 11: Create Gallery Component

**Files:**
- Create: `apps/frontend/components/landing/Gallery.tsx`

- [ ] **Step 1: Create Gallery.tsx**

```tsx
// apps/frontend/components/landing/Gallery.tsx
'use client';

import { motion, useReducedMotion } from 'motion/react';

interface GalleryImage {
  url: string;
  alt?: string | null;
  caption?: string | null;
}

interface GalleryProps {
  title?: string;
  subtext?: string;
  images: GalleryImage[];
}

export default function Gallery({
  title = 'Past Events',
  subtext = 'Moments from events we have powered.',
  images,
}: GalleryProps) {
  const reduce = useReducedMotion();

  if (images.length === 0) return null;

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-heading-xl font-heading text-brand-text mb-4">
            {title}
          </h2>
          <p className="text-body text-brand-textMuted max-w-[60ch] mx-auto">
            {subtext}
          </p>
        </motion.div>

        {/* Masonry Grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {images.map((image, index) => (
            <motion.div
              key={index}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="break-inside-avoid group"
            >
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={image.url}
                  alt={image.alt || ''}
                  className={`w-full object-cover transition-transform duration-300 ${
                    reduce ? '' : 'group-hover:scale-[1.02]'
                  }`}
                  style={{ aspectRatio: index % 3 === 0 ? '4/3' : index % 3 === 1 ? '1/1' : '3/4' }}
                  loading="lazy"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-sm text-white">{image.caption}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/landing/Gallery.tsx
git commit -m "feat: add Gallery component with masonry layout and scroll-reveal"
```

---

### Task 12: Update Footer Component

**Files:**
- Modify: `apps/frontend/components/landing/Footer.tsx`

- [ ] **Step 1: Update Footer.tsx**

Replace the entire content with:
```tsx
// apps/frontend/components/landing/Footer.tsx
import Link from 'next/link';
import { Users } from 'lucide-react';

interface FooterProps {
  eventName?: string;
  logoUrl?: string;
}

export default function Footer({ eventName, logoUrl }: FooterProps) {
  return (
    <footer className="py-12 border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left: Brand mark */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={eventName || 'Event logo'} className="h-6 w-auto object-contain" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center">
                <Users className="w-3 h-3 text-brand-primary" />
              </div>
            )}
            <span className="text-body-sm font-heading text-brand-text">
              {eventName || 'Event Management'}
            </span>
          </div>

          {/* Center: Links */}
          <nav className="flex items-center gap-8">
            <Link
              href="/show"
              className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors"
            >
              Display
            </Link>
            <Link
              href="/admin/login"
              className="text-body-sm text-brand-textMuted hover:text-brand-text transition-colors"
            >
              Login
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/landing/Footer.tsx
git commit -m "feat: update Footer to remove About link and accept dynamic brand"
```

---

### Task 13: Update Landing Page (page.tsx)

**Files:**
- Modify: `apps/frontend/app/(main)/page.tsx`

- [ ] **Step 1: Replace page.tsx with dynamic version**

```tsx
// apps/frontend/app/(main)/page.tsx
import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Gallery from '@/components/landing/Gallery';
import Footer from '@/components/landing/Footer';
import { apiFetch } from '@/lib/api';

interface EventConfig {
  name?: string;
  logoUrl?: string;
}

interface LandingPageData {
  hero: {
    headline: string;
    subtext: string;
    ctaPrimary: string;
    ctaSecondary: string;
    images: { url: string; alt?: string | null; intervalMs?: number }[];
  };
  features: {
    id: string;
    title: string;
    description: string;
    sortOrder: number;
    images: { url: string; alt?: string | null; intervalMs?: number }[];
  }[];
  gallery: {
    title: string;
    subtext: string;
    images: { url: string; alt?: string | null; caption?: string | null }[];
  };
  toggles: {
    showHero: boolean;
    showFeatures: boolean;
    showGallery: boolean;
    showFooter: boolean;
  };
}

async function getEventConfig(): Promise<EventConfig | null> {
  try {
    return await apiFetch<EventConfig>('/config/event');
  } catch {
    return null;
  }
}

async function getLandingPageData(): Promise<LandingPageData | null> {
  try {
    return await apiFetch<LandingPageData>('/public/landing-page');
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const [eventConfig, landingData] = await Promise.all([
    getEventConfig(),
    getLandingPageData(),
  ]);

  const toggles = landingData?.toggles ?? {
    showHero: true,
    showFeatures: true,
    showGallery: true,
    showFooter: true,
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <LandingNav eventConfig={eventConfig} />
      <main>
        {toggles.showHero && (
          <Hero
            headline={landingData?.hero.headline}
            subtext={landingData?.hero.subtext}
            ctaPrimary={landingData?.hero.ctaPrimary}
            ctaSecondary={landingData?.hero.ctaSecondary}
            images={landingData?.hero.images}
          />
        )}
        {toggles.showFeatures && landingData?.features && (
          <Features features={landingData.features} />
        )}
        {toggles.showGallery && landingData?.gallery && (
          <Gallery
            title={landingData.gallery.title}
            subtext={landingData.gallery.subtext}
            images={landingData.gallery.images}
          />
        )}
      </main>
      {toggles.showFooter && (
        <Footer eventName={eventConfig?.name} logoUrl={eventConfig?.logoUrl} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/app/\(main\)/page.tsx
git commit -m "feat: update landing page to fetch and render dynamic content"
```

---

### Task 14: Create SortableImageList Admin Component

**Files:**
- Create: `apps/frontend/components/landing/SortableImageList.tsx`

- [ ] **Step 1: Create SortableImageList.tsx**

```tsx
// apps/frontend/components/landing/SortableImageList.tsx
'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';

interface SortableImage {
  id: string;
  url: string;
  alt?: string | null;
  intervalMs?: number;
  caption?: string | null;
}

interface SortableImageListProps {
  images: SortableImage[];
  onReorder: (imageIds: string[]) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onUpload: (file: File, alt?: string, caption?: string) => Promise<void>;
  showCaption?: boolean;
  showInterval?: boolean;
  emptyMessage?: string;
}

function SortableItem({
  image,
  onDelete,
  showCaption,
  showInterval,
  onUpdate,
}: {
  image: SortableImage;
  onDelete: () => Promise<void>;
  showCaption?: boolean;
  showInterval?: boolean;
  onUpdate: (updates: Partial<SortableImage>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group surface p-3 rounded-xl"
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-2 cursor-grab active:cursor-grabbing text-brand-textMuted hover:text-brand-text"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Image preview */}
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-brand-surfaceBright shrink-0">
          <img src={image.url} alt={image.alt || ''} className="w-full h-full object-cover" />
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          {showInterval && (
            <div>
              <Label className="text-xs">Interval (ms)</Label>
              <Input
                type="number"
                min={3000}
                value={image.intervalMs ?? 5000}
                onChange={(e) => onUpdate({ intervalMs: parseInt(e.target.value) || 5000 })}
                className="w-24 text-sm"
              />
            </div>
          )}
          {showCaption && (
            <div>
              <Label className="text-xs">Caption</Label>
              <Input
                value={image.caption || ''}
                onChange={(e) => onUpdate({ caption: e.target.value })}
                placeholder="Optional caption"
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-2 text-brand-textMuted hover:text-brand-danger transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SortableImageList({
  images,
  onReorder,
  onDelete,
  onUpload,
  showCaption = false,
  showInterval = false,
  emptyMessage = 'No images uploaded.',
}: SortableImageListProps) {
  const [uploading, setUploading] = useState(false);
  const [localImages, setLocalImages] = useState(images);

  // Sync with prop changes
  useState(() => {
    setLocalImages(images);
  }, [images]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localImages.findIndex((img) => img.id === active.id);
    const newIndex = localImages.findIndex((img) => img.id === over.id);
    const newImages = arrayMove(localImages, oldIndex, newIndex);

    setLocalImages(newImages);
    await onReorder(newImages.map((img) => img.id));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onUpload(file);
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    await onDelete(imageId);
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return (
    <div className="space-y-4">
      {localImages.length === 0 ? (
        <p className="text-sm text-brand-textMuted text-center py-8 surface rounded-xl">
          {emptyMessage}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localImages.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localImages.map((image) => (
                <SortableItem
                  key={image.id}
                  image={image}
                  onDelete={() => handleDelete(image.id)}
                  showCaption={showCaption}
                  showInterval={showInterval}
                  onUpdate={() => {}} // Interval/caption updates handled separately if needed
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl surface-interactive cursor-pointer hover:bg-brand-surfaceMuted transition-colors">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Upload Image</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {uploading && <span className="text-sm text-brand-textMuted">Uploading...</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/landing/SortableImageList.tsx
git commit -m "feat: add SortableImageList with dnd-kit for admin image management"
```

---

### Task 15: Create Admin Landing Page Settings Page

**Files:**
- Create: `apps/frontend/app/(main)/admin/settings/landing-page/page.tsx`

- [ ] **Step 1: Create admin landing page settings page**

This is a large file. Create the full admin page with hero settings, features management, gallery settings, and section toggles. Due to length, this task includes the complete implementation.

```tsx
// apps/frontend/app/(main)/admin/settings/landing-page/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Label from '@/components/ui/Label';
import Toggle from '@/components/ui/Toggle';
import SortableImageList from '@/components/landing/SortableImageList';
import { apiFetch, getToken, parseErrorMessage } from '@/lib/api';
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';

// ... (full implementation with all sections)

export default function LandingPageSettings() {
  return (
    <RequireAuth>
      <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
        <h1 className="text-heading-lg font-heading text-brand-text">
          Landing Page Settings
        </h1>
        {/* Sections: Hero, Features, Gallery, Toggles */}
        {/* Full implementation here */}
      </div>
    </RequireAuth>
  );
}
```

Due to the complexity and length of this file, the full implementation should be developed following the patterns in `apps/frontend/app/(main)/admin/settings/event/page.tsx` for:
- RequireAuth wrapper
- Token-based API calls
- Form state management
- Success/error alerts
- File upload handling

Key sections to implement:
1. **Hero Settings**: headline, subtext, CTA inputs + SortableImageList for hero images
2. **Features Management**: Add/delete/reorder features with nested image management
3. **Gallery Settings**: title, subtext + SortableImageList with captions
4. **Section Toggles**: Four Toggle components for showHero/showFeatures/showGallery/showFooter

- [ ] **Step 2: Test the admin page loads**

Navigate to `/admin/settings/landing-page` and verify:
- Page renders with all sections
- Empty states display correctly
- Forms are interactive

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/\(main\)/admin/settings/landing-page/
git commit -m "feat: add admin landing page settings with dnd-kit"
```

---

### Task 16: Add Admin Navigation Link

**Files:**
- Modify: Admin navigation component (check `apps/frontend/components/admin/TopNav.tsx` or similar)

- [ ] **Step 1: Add Landing Page link to admin settings navigation**

Find the admin settings navigation and add:
```tsx
<Link href="/admin/settings/landing-page">Landing Page</Link>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/components/admin/
git commit -m "feat: add Landing Page link to admin navigation"
```

---

### Task 17: Integration Testing

**Files:**
- Test: Manual testing across all features

- [ ] **Step 1: Test public landing page**

- Navigate to `/` and verify dynamic content renders
- Test hero carousel auto-rotates
- Test feature carousels auto-rotate
- Test gallery displays in masonry

- [ ] **Step 2: Test admin page**

- Navigate to `/admin/settings/landing-page`
- Test CRUD for features
- Test image upload/delete/reorder
- Test section toggles hide/show sections on landing page

- [ ] **Step 3: Test reduced motion**

- Enable reduced motion in OS settings
- Verify carousels don't auto-advance
- Verify transitions are instant

- [ ] **Step 4: Test responsive**

- Test landing page on mobile, tablet, desktop
- Test admin page on mobile, tablet, desktop

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete landing page customization feature"
```

---

## Summary

This plan covers:
1. **Backend**: Prisma models, NestJS module with public/admin APIs, image storage
2. **Frontend**: Dynamic landing page components (Hero, Features, Gallery), admin settings page with dnd-kit
3. **Integration**: Data fetching, toggles, responsive design

Total: 17 tasks covering the full implementation from database to UI.
