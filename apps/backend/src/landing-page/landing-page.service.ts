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

    for (const img of feature.images) {
      await this.deleteFileFromDisk(img.url);
    }

    await this.prisma.landingPageFeature.delete({ where: { id: featureId } });
    return { success: true };
  }

  async reorderFeatures(featureIds: string[]) {
    const eventId = await this.getActiveEventId();
    const config = await this.getOrCreateConfig(eventId);

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
      const relativePath = url.replace('/api/', '');
      await unlink(join(process.cwd(), relativePath));
    } catch {
      // File may already be deleted, ignore
    }
  }
}
