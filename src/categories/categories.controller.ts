import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getCategories(@Req() req) {
    return this.categoriesService.getCategories(req.user.tenantId);
  }

  @Get('flat')
  getAllFlatCategories(@Req() req) {
    return this.categoriesService.getAllFlatCategories(req.user.tenantId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  createCategory(
    @Req() req,
    @Body() data: any,
    @UploadedFile() file?: any,
  ) {
    return this.categoriesService.createCategory(req.user.tenantId, data, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  updateCategory(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
    @UploadedFile() file?: any,
  ) {
    return this.categoriesService.updateCategory(req.user.tenantId, id, data, file);
  }

  @Delete(':id')
  deleteCategory(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.deleteCategory(req.user.tenantId, id);
  }
}
