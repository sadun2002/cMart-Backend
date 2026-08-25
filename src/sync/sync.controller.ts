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
  @Roles('SUPER_ADMIN', 'ADMIN') // Only admins of the tenant can sync data
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
}
