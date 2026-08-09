import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  getSuppliers(@Req() req: any, @Query('search') search?: string) {
    return this.suppliersService.getSuppliers(req.user.tenantId, search);
  }

  @Post()
  createSupplier(@Req() req: any, @Body() data: any) {
    return this.suppliersService.createSupplier(req.user.tenantId, data);
  }

  @Patch(':id')
  updateSupplier(
    @Req() req: any, 
    @Param('id', ParseIntPipe) id: number, 
    @Body() data: any
  ) {
    return this.suppliersService.updateSupplier(req.user.tenantId, id, data);
  }

  @Delete(':id')
  deleteSupplier(
    @Req() req: any, 
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.suppliersService.deleteSupplier(req.user.tenantId, id);
  }
}
