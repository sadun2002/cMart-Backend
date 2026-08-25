import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThemeType } from '@prisma/client';

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  async getAllThemes() {
    return this.prisma.theme.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  async getActiveThemes() {
    return this.prisma.theme.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyTheme(tenantId: number) {
    const tenantTheme = await this.prisma.tenantTheme.findUnique({
      where: { tenantId },
      include: { theme: true },
    });
    
    if (!tenantTheme) {
      // Fallback to default theme if not set
      const defaultTheme = await this.prisma.theme.findFirst({ where: { slug: 'minimalist-store' } });
      if (defaultTheme) {
        return this.prisma.tenantTheme.create({
          data: {
            tenantId,
            themeId: defaultTheme.id,
            customizations: {},
          },
          include: { theme: true },
        });
      }
      throw new NotFoundException('No active theme found for this tenant');
    }
    
    return tenantTheme;
  }

  async updateCustomizations(tenantId: number, customizations: any) {
    const tenantTheme = await this.getMyTheme(tenantId);
    
    // Merge existing customizations with new ones
    const currentCustomizations = typeof tenantTheme.customizations === 'object' && tenantTheme.customizations !== null 
      ? tenantTheme.customizations 
      : {};
      
    const newCustomizations = {
      ...currentCustomizations,
      ...customizations,
    };

    return this.prisma.tenantTheme.update({
      where: { tenantId },
      data: {
        customizations: newCustomizations,
      },
      include: { theme: true },
    });
  }

  async createTheme(data: {
    name: string;
    description?: string;
    previewUrl?: string;
    zipUrl?: string;
    price?: number;
    type?: ThemeType;
    version?: string;
  }, adminId: number) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    return this.prisma.theme.create({
      data: {
        ...data,
        slug,
        uploadedById: adminId,
      },
    });
  }

  async toggleThemeStatus(id: number, isActive: boolean) {
    const theme = await this.prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundException('Theme not found');

    return this.prisma.theme.update({
      where: { id },
      data: { isActive },
    });
  }
}
