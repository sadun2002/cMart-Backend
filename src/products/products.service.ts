import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp'; // Will use require instead
// Workaround for sharp TS error
const sharpModule = require('sharp');

@Injectable()
export class ProductsService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getProducts(tenantId: number) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { category: true, images: true }
    });
  }

  private async uploadImage(file: any): Promise<string> {
    const bucket = process.env.SUPABASE_BUCKET_PRODUCTS || 'product-images';
    
    // Process image with sharp to WebP format
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharpModule(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      this.logger.error(`Image processing error: ${err.message}`);
      throw new BadRequestException('Failed to process image format. Please ensure it is a valid image.');
    }

    const filename = `${uuidv4()}.webp`;
    
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filename, processedBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      this.logger.error(`Supabase upload error: ${error.message}`);
      throw new BadRequestException(`Image upload failed: ${error.message}. Please check your Supabase bucket settings.`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return publicUrlData.publicUrl;
  }

  async createProduct(tenantId: number, data: any, files?: any[]) {
    const { showOnWebsite, categoryId, subcategoryId, ...rest } = data;
    
    // Clean up category IDs to null if they are 'null' string
    const finalCategoryId = subcategoryId !== 'null' && subcategoryId ? parseInt(subcategoryId) : 
                            (categoryId !== 'null' && categoryId ? parseInt(categoryId) : null);
    
    let productData: any = {
      ...rest,
    };
    
    if (showOnWebsite !== undefined) {
      productData.showOnWebsite = showOnWebsite === 'true' || showOnWebsite === true;
    }
    
    productData.categoryId = finalCategoryId;
    productData.tenantId = tenantId;

    const product = await this.prisma.product.create({
      data: productData,
      include: { category: true, images: true }
    });

    if (files && files.length > 0) {
      for (const file of files) {
        const imageUrl = await this.uploadImage(file);
        await this.prisma.productImage.create({
          data: {
            productId: product.id,
            url: imageUrl
          }
        });
      }
      return this.prisma.product.findUnique({
        where: { id: product.id },
        include: { category: true, images: true }
      });
    }

    return product;
  }

  async updateProduct(tenantId: number, id: number, data: any, files?: any[]) {
    // Enforce tenant isolation
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId }
    });

    if (!product) throw new NotFoundException('Product not found or access denied');

    const { showOnWebsite, categoryId, subcategoryId, deletedImageIds, ...rest } = data;
    
    const finalCategoryId = subcategoryId !== 'null' && subcategoryId ? parseInt(subcategoryId) : 
                            (categoryId !== 'null' && categoryId ? parseInt(categoryId) : null);
                            
    let productData: any = {
      ...rest,
    };
    
    if (showOnWebsite !== undefined) {
      productData.showOnWebsite = showOnWebsite === 'true' || showOnWebsite === true;
    }
    
    if (finalCategoryId !== undefined) {
      productData.categoryId = finalCategoryId;
    }

    if (deletedImageIds) {
      let parsedIds = [];
      try {
        parsedIds = JSON.parse(deletedImageIds);
      } catch(e) {}
      
      if (parsedIds.length > 0) {
        const imagesToDelete = await this.prisma.productImage.findMany({
          where: { id: { in: parsedIds }, productId: id }
        });
        
        await this.prisma.productImage.deleteMany({
          where: { id: { in: parsedIds }, productId: id }
        });
        
        const bucket = process.env.SUPABASE_BUCKET_PRODUCTS || 'product-images';
        const filenames = imagesToDelete.map(img => {
          const parts = img.url.split('/');
          return parts[parts.length - 1];
        });
        if (filenames.length > 0) {
           this.supabase.storage.from(bucket).remove(filenames).catch(err => this.logger.error(err));
        }
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true, images: true }
    });

    if (files && files.length > 0) {
      for (const file of files) {
        const imageUrl = await this.uploadImage(file);
        await this.prisma.productImage.create({
          data: {
            productId: updated.id,
            url: imageUrl
          }
        });
      }
      return this.prisma.product.findUnique({
        where: { id },
        include: { category: true, images: true }
      });
    }

    return updated;
  }

  async deleteProduct(tenantId: number, id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId }
    });

    if (!product) throw new NotFoundException('Product not found or access denied');

    return this.prisma.product.delete({
      where: { id }
    });
  }
}
