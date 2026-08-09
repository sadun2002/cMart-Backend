import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('branch/:branchId')
  getBranchInventory(@CurrentUser() user: any, @Param('branchId') branchId: string) {
    return this.inventoryService.getBranchInventory(user.tenantId, +branchId);
  }

  @Post('branch/:branchId/adjust')
  stockAdjustment(@CurrentUser() user: any, @Param('branchId') branchId: string, @Body() data: any) {
    return this.inventoryService.stockAdjustment(user.tenantId, +branchId, data);
  }
}
