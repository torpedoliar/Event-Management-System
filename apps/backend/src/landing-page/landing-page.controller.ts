import {
  Controller, Get, Put, Post, Delete, Param, Body,
  UploadedFile, UseGuards, UseInterceptors, Res,
  BadRequestException, Logger
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
  private readonly logger = new Logger(LandingPageController.name);

  constructor(private readonly landingPage: LandingPageService) {}

  // --- Public API ---

  @Get('public/landing-page')
  async getPublicLandingPage(@Res() res: Response) {
    const data = await this.landingPage.getPublicLandingPage();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
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
  async updateConfig(@Body() dto: UpdateLandingConfigDto) {
    try {
      return await this.landingPage.updateConfig(dto);
    } catch (error: any) {
      this.logger.error(`updateConfig failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Features ---

  @UseGuards(JwtAuthGuard)
  @Post('admin/landing-page/features')
  async createFeature(@Body() dto: CreateFeatureDto) {
    try {
      return await this.landingPage.createFeature(dto);
    } catch (error: any) {
      this.logger.error(`createFeature failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/features/:id')
  async updateFeature(@Param('id') id: string, @Body() dto: UpdateFeatureDto) {
    try {
      return await this.landingPage.updateFeature(id, dto);
    } catch (error: any) {
      this.logger.error(`updateFeature failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/features/:id')
  async deleteFeature(@Param('id') id: string) {
    try {
      return await this.landingPage.deleteFeature(id);
    } catch (error: any) {
      this.logger.error(`deleteFeature failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/features/reorder')
  async reorderFeatures(@Body('featureIds') featureIds: string[]) {
    try {
      return await this.landingPage.reorderFeatures(featureIds);
    } catch (error: any) {
      this.logger.error(`reorderFeatures failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Hero Images ---

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: landingPageStorage('hero'),
    limits: IMAGE_LIMITS,
    ...IMAGE_FILTER,
  }))
  @Post('admin/landing-page/hero-image')
  async uploadHeroImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
  ) {
    try {
      return await this.landingPage.uploadHeroImage(file, alt);
    } catch (error: any) {
      this.logger.error(`uploadHeroImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/hero-image/:id')
  async deleteHeroImage(@Param('id') id: string) {
    try {
      return await this.landingPage.deleteHeroImage(id);
    } catch (error: any) {
      this.logger.error(`deleteHeroImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/hero-image/reorder')
  async reorderHeroImages(@Body('imageIds') imageIds: string[]) {
    try {
      return await this.landingPage.reorderHeroImages(imageIds);
    } catch (error: any) {
      this.logger.error(`reorderHeroImages failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Feature Images ---

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: landingPageStorage('features'),
    limits: IMAGE_LIMITS,
    ...IMAGE_FILTER,
  }))
  @Post('admin/landing-page/features/:id/images')
  async uploadFeatureImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
  ) {
    try {
      return await this.landingPage.uploadFeatureImage(id, file, alt);
    } catch (error: any) {
      this.logger.error(`uploadFeatureImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/features/:id/images/:imageId')
  async deleteFeatureImage(@Param('id') _id: string, @Param('imageId') imageId: string) {
    try {
      return await this.landingPage.deleteFeatureImage(imageId);
    } catch (error: any) {
      this.logger.error(`deleteFeatureImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/features/:id/images/reorder')
  async reorderFeatureImages(@Body('imageIds') imageIds: string[]) {
    try {
      return await this.landingPage.reorderFeatureImages(imageIds);
    } catch (error: any) {
      this.logger.error(`reorderFeatureImages failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- Gallery Images ---

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: landingPageStorage('gallery'),
    limits: IMAGE_LIMITS,
    ...IMAGE_FILTER,
  }))
  @Post('admin/landing-page/gallery')
  async uploadGalleryImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('alt') alt?: string,
    @Body('caption') caption?: string,
  ) {
    try {
      return await this.landingPage.uploadGalleryImage(file, alt, caption);
    } catch (error: any) {
      this.logger.error(`uploadGalleryImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/landing-page/gallery/:id')
  async deleteGalleryImage(@Param('id') id: string) {
    try {
      return await this.landingPage.deleteGalleryImage(id);
    } catch (error: any) {
      this.logger.error(`deleteGalleryImage failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('admin/landing-page/gallery/reorder')
  async reorderGalleryImages(@Body('imageIds') imageIds: string[]) {
    try {
      return await this.landingPage.reorderGalleryImages(imageIds);
    } catch (error: any) {
      this.logger.error(`reorderGalleryImages failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
