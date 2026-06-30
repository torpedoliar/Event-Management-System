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
              create: jest.fn().mockResolvedValue(mockConfig),
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
