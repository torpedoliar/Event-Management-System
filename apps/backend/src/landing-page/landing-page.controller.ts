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
  deleteFeatureImage(@Param('id') _id: string, @Param('imageId') imageId: string) {
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
