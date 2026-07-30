import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
const sharpModule = require('sharp');

@Injectable()
export class CategoriesService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private prisma: PrismaService) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Math.floor(Math.random() * 10000);
  }

  private async uploadImage(file: any): Promise<string> {
    const bucket = process.env.SUPABASE_BUCKET_PRODUCTS || 'product-images'; // using product-images bucket for simplicity, or we can use a themes/logos bucket.
    
    let processedBuffer: Buffer;
    try {
      processedBuffer = await sharpModule(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      this.logger.error(`Image processing error: ${err.message}`);
      throw new BadRequestException('Failed to process image format.');
    }

    const filename = `categories/${uuidv4()}.webp`;
    
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

  async getCategories(tenantId: number) {
    // Get root categories with their children
    return this.prisma.category.findMany({
      where: { 
        tenantId,
        parentId: null 
      },
      include: { 
        _count: { select: { products: true } },
        children: {
          include: {
            _count: { select: { products: true } },
            children: {
              include: {
                _count: { select: { products: true } }
              }
            } // support up to 3 levels
          }
        } 
      },
      orderBy: { sortOrder: 'asc' }
    });
  }
  
  async getAllFlatCategories(tenantId: number) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });
  }

  async createCategory(tenantId: number, data: any, file?: any) {
    const { name, description, parentId, active, sortOrder } = data;
    
    if (!name) throw new BadRequestException('Category name is required');

    let imageUrl: string | null = null;
    if (file) {
      imageUrl = await this.uploadImage(file);
    }

    return this.prisma.category.create({
      data: {
        tenantId,
        name,
        slug: this.generateSlug(name),
        description,
        parentId: parentId ? parseInt(parentId, 10) : null,
        active: active === 'true' || active === true,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 0,
        image: imageUrl
      }
    });
  }

  async updateCategory(tenantId: number, id: number, data: any, file?: any) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId }
    });

    if (!category) throw new NotFoundException('Category not found');

    const { name, description, parentId, active, sortOrder } = data;
    
    let imageUrl = category.image;
    if (file) {
      imageUrl = await this.uploadImage(file);
    }

    const updateData: any = {
      description,
      image: imageUrl
    };

    if (name) {
      updateData.name = name;
      updateData.slug = this.generateSlug(name);
    }
    if (parentId !== undefined) updateData.parentId = parentId === 'null' || !parentId ? null : parseInt(parentId, 10);
    if (active !== undefined) updateData.active = active === 'true' || active === true;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder, 10);

    return this.prisma.category.update({
      where: { id },
      data: updateData
    });
  }

  async deleteCategory(tenantId: number, id: number) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        children: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) throw new NotFoundException('Category not found');

    if (category.children.length > 0) {
      throw new BadRequestException('Cannot delete a category that has subcategories. Delete them first.');
    }

    if (category._count.products > 0) {
      throw new BadRequestException(`Cannot delete. There are ${category._count.products} products in this category.`);
    }

    return this.prisma.category.delete({
      where: { id }
    });
  }
}
