import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getProducts(@CurrentUser() user: any) {
    return this.productsService.getProducts(user.tenantId);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 15))
  createProduct(@CurrentUser() user: any, @Body() data: any, @UploadedFiles() files: any[]) {
    return this.productsService.createProduct(user.tenantId, data, files);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 15))
  updateProduct(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
    @UploadedFiles() files?: any[]
  ) {
    return this.productsService.updateProduct(user.tenantId, +id, data, files);
  }

  @Delete(':id')
  deleteProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.deleteProduct(user.tenantId, +id);
  }
}
