import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CloudSyncGuard } from '../auth/guards/cloud-sync.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard, CloudSyncGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('bulk')
  @Roles('STORE_OWNER', 'SUPER_ADMIN', 'ADMIN') // Allow store owner and admins of the tenant to sync data
  async bulkSync(
    @Request() req,
    @Body()
    payload: {
      categories?: any[];
      products?: any[];
      sales?: any[];
      sale_items?: any[];
      expenses?: any[];
      settings?: any[];
    },
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.syncService.processBulkSync(tenantId, userId, payload);
  }

  @Post('reset-data')
  @Roles('STORE_OWNER', 'SUPER_ADMIN', 'ADMIN')
  async resetData(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.syncService.resetStoreBusinessData(tenantId);
  }
}
