import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  createSale(@CurrentUser() user: any, @Body() data: any) {
    return this.salesService.createSale(user.tenantId, data, user.id);
  }

  @Get()
  getRecentSales(@CurrentUser() user: any) {
    return this.salesService.getRecentSales(user.tenantId);
  }

  @Get('me')
  getMySales(@CurrentUser() user: any) {
    return this.salesService.getMySales(user.tenantId, user.id);
  }
}
