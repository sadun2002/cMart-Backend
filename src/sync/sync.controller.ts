import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanGuard } from '../common/guards/plan.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlanType } from '../common/decorators/plan.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'ADMIN') // Only admins of the tenant can sync data
  @PlanType('PRO', 'ENTERPRISE') // Only PRO and ENTERPRISE tiers can sync to cloud
  async bulkSync(
    @Request() req,
    @Body()
    payload: {
      products: any[];
      sales: any[];
      expenses: any[];
      settings: any[];
    },
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.syncService.processBulkSync(tenantId, userId, payload);
  }
}
