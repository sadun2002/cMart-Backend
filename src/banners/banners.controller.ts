import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Public()
  @Get('public/:domain')
  getPublicBanners(@Param('domain') domain: string) {
    return this.bannersService.getPublicBanners(domain);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getBanners(@CurrentUser() user: any) {
    return this.bannersService.getBanners(user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  createBanner(@CurrentUser() user: any, @Body() data: any, @UploadedFile() file: any) {
    return this.bannersService.createBanner(user.tenantId, data, file);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  updateBanner(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFile() file?: any
  ) {
    return this.bannersService.updateBanner(user.tenantId, +id, data, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteBanner(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bannersService.deleteBanner(user.tenantId, +id);
  }
}
