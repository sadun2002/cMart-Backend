import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ThemeType } from '@prisma/client';

@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  // Public endpoint or restricted to tenants? Let's make it public/tenants
  // For now, anyone can see active themes
  @Get()
  getActiveThemes() {
    return this.themesService.getActiveThemes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('all')
  getAllThemes() {
    return this.themesService.getAllThemes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post()
  createTheme(
    @Body() data: {
      name: string;
      description?: string;
      previewUrl?: string;
      zipUrl?: string;
      price?: number;
      type?: ThemeType;
      version?: string;
    },
    @CurrentUser() admin: any,
  ) {
    return this.themesService.createTheme(data, admin.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':id/status')
  toggleThemeStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.themesService.toggleThemeStatus(+id, isActive);
  }
}
