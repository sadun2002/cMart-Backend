import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataRetentionCleanup() {
    this.logger.log('Starting daily Cloud Data Retention Cleanup...');

    // Find tenants whose cloud retention has expired
    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        plan: 'STARTUP',
        cloudRetentionUntil: {
          lt: new Date(), // Passed the retention date
        },
      },
      select: { id: true, businessName: true },
    });

    if (expiredTenants.length === 0) {
      this.logger.log('No expired tenants found for data cleanup.');
      return;
    }

    for (const tenant of expiredTenants) {
      this.logger.warn(`Archived cloud data for Tenant ${tenant.id} (${tenant.businessName}) has expired. Starting deletion...`);

      try {
        await this.prisma.$transaction(async (tx) => {
          // Delete Sales and related Items
          await tx.saleItem.deleteMany({
            where: { sale: { tenantId: tenant.id } },
          });
          await tx.sale.deleteMany({
            where: { tenantId: tenant.id },
          });

          // Delete other heavy cloud data (Customers, Branch Inventory)
          await tx.branchInventory.deleteMany({
            where: { branch: { tenantId: tenant.id } },
          });
          
          await tx.customer.deleteMany({
            where: { tenantId: tenant.id },
          });

          // We retain Products, Users, Branches, and basic settings so they can use local mode
          // Update the tenant to indicate cleanup is complete
          await tx.tenant.update({
            where: { id: tenant.id },
            data: { cloudRetentionUntil: null }, // Clear to prevent repeated deletions
          });
        });

        this.logger.log(`Successfully deleted archived cloud data for Tenant ${tenant.id}`);
      } catch (error) {
        this.logger.error(`Failed to delete data for Tenant ${tenant.id}:`, error);
      }
    }
  }
}
