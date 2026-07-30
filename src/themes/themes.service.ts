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
