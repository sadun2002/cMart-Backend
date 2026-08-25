import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
const sharpModule = require('sharp');

@Injectable()
export class BannersService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(BannersService.name);

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getBanners(tenantId: number) {
    return this.prisma.banner.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' }
    });
  }

  async getPublicBanners(domain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain: domain }
    });
    if (!tenant) throw new NotFoundException('Store not found');

    return this.prisma.banner.findMany({
      where: { tenantId: tenant.id, status: 'Active' },
      orderBy: { order: 'asc' }
    });
  }

  private async uploadImage(file: any): Promise<string> {
    const bucket = process.env.SUPABASE_BUCKET_PRODUCTS || 'product-images';
    
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharpModule(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      this.logger.error(`Image processing error: ${err.message}`);
      throw new BadRequestException('Failed to process image format. Please ensure it is a valid image.');
    }

    const filename = `banner_${uuidv4()}.webp`;
    
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filename, processedBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      this.logger.error(`Supabase upload error: ${error.message}`);
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  }

  async createBanner(tenantId: number, data: any, file?: any) {
    let imageUrl = '';
    const order = data.order ? parseInt(data.order) : 0;

    if (file) {
      imageUrl = await this.uploadImage(file);
    } else if (data.image) {
      imageUrl = data.image;
    } else {
      throw new BadRequestException('Banner image is required');
    }

    return this.prisma.banner.create({
      data: {
        tenantId,
        title: data.title,
        subtitle: data.subtitle,
        image: imageUrl,
        ctaText: data.ctaText,
        ctaLink: data.ctaLink,
        status: data.status || 'Inactive',
        order: order
      }
    });
  }

  async updateBanner(tenantId: number, id: number, data: any, file?: any) {
    const banner = await this.prisma.banner.findFirst({
      where: { id, tenantId }
    });

    if (!banner) throw new NotFoundException('Banner not found');

    let imageUrl = banner.image;

    if (file) {
      imageUrl = await this.uploadImage(file);
      
      const bucket = process.env.SUPABASE_BUCKET_PRODUCTS || 'product-images';
      try {
        const urlObj = new URL(banner.image);
        const parts = urlObj.pathname.split('/');
        const oldFilename = parts[parts.length - 1];
        if (oldFilename && oldFilename.startsWith('banner_')) {
          this.supabase.storage.from(bucket).remove([oldFilename]).catch(err => this.logger.error(err));
        }
      } catch (e) {}
    }

    const order = data.order !== undefined ? parseInt(data.order) : banner.order;

    return this.prisma.banner.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : banner.title,
        subtitle: data.subtitle !== undefined ? data.subtitle : banner.subtitle,
        image: imageUrl,
        ctaText: data.ctaText !== undefined ? data.ctaText : banner.ctaText,
        ctaLink: data.ctaLink !== undefined ? data.ctaLink : banner.ctaLink,
        status: data.status !== undefined ? data.status : banner.status,
        order: order
      }
    });
  }

  async deleteBanner(tenantId: number, id: number) {
    const banner = await this.prisma.banner.findFirst({
      where: { id, tenantId }
    });

    if (!banner) throw new NotFoundException('Banner not found');

    const bucket = process.env.SUPABASE_BUCKET_PRODUCTS || 'product-images';
    try {
      const urlObj = new URL(banner.image);
      const parts = urlObj.pathname.split('/');
      const oldFilename = parts[parts.length - 1];
      if (oldFilename && oldFilename.startsWith('banner_')) {
        await this.supabase.storage.from(bucket).remove([oldFilename]);
      }
    } catch (e) {}

    return this.prisma.banner.delete({
      where: { id }
    });
  }
}
