import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('stores')
  getAllStores() {
    return this.adminService.getAllStores();
  }

  @Patch('stores/:id/status')
  updateStoreStatus(
    @Param('id') id: string,
    @Body('suspend') suspend: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateStoreStatus(+id, suspend, reason);
  }

  @Get('payments')
  getPayments() {
    return this.adminService.getPayments();
  }
}
