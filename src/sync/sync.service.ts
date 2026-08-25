import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processBulkSync(
    tenantId: number,
    userId: number,
    payload: {
      products?: any[];
      sales?: any[];
      expenses?: any[];
      settings?: any[];
    },
  ) {
    this.logger.log(`Starting bulk sync for tenant ${tenantId}`);
    
    const { products = [], sales = [], expenses = [], settings = [] } = payload;

    return this.prisma.$transaction(async (tx) => {
      // 1. Process Categories & Products
      for (const prod of products) {
        let categoryId: number | null = null;
        
        // Find or create category
        if (prod.category) {
          const categorySlug = prod.category.toLowerCase().replace(/\s+/g, '-');
          let cat = await tx.category.findUnique({
            where: { tenantId_slug: { tenantId, slug: categorySlug } },
          });
          
          if (!cat) {
            cat = await tx.category.create({
              data: {
                tenantId,
                name: prod.category,
                slug: categorySlug,
              },
            });
          }
          categoryId = cat.id;
        }

        // Upsert Product
        await tx.product.upsert({
          where: { offlineId: prod.id },
          create: {
            tenantId,
            offlineId: prod.id,
            name: prod.name,
            sku: prod.sku || null,
            price: prod.price || 0,
            categoryId,
          },
          update: {
            name: prod.name,
            sku: prod.sku || null,
            price: prod.price || 0,
            categoryId,
          },
        });
        
        // Note: we don't sync 'stock' directly here because stock is managed via BranchInventory in the Cloud.
        // For a full implementation, we would create a BranchInventory record for the main branch.
        // To keep it simple, we skip stock sync or we can fetch the first branch and update it.
      }

      // 2. Process Sales
      // Create a fallback product for offline sales if items aren't detailed
      let fallbackProduct = await tx.product.findFirst({
        where: { tenantId, name: 'Offline Sale' }
      });
      if (!fallbackProduct) {
        fallbackProduct = await tx.product.create({
          data: {
            tenantId,
            name: 'Offline Sale',
            price: 0,
            active: false
          }
        });
      }

      for (const sale of sales) {
        // Upsert Sale
        const invoiceNo = `OFF-${sale.id.slice(0, 8).toUpperCase()}`;
        
        const existingSale = await tx.sale.findUnique({
          where: { offlineId: sale.id },
        });

        if (!existingSale) {
          await tx.sale.create({
            data: {
              tenantId,
              offlineId: sale.id,
              invoiceNo,
              subtotal: sale.total,
              total: sale.total,
              paymentMethod: 'CASH', // Default for offline
              paymentStatus: 'COMPLETED',
              userId: userId,
              createdAt: new Date(sale.created_at),
              items: {
                create: [
                  {
                    productId: fallbackProduct.id,
                    productName: 'Offline Sale Data',
                    quantity: 1,
                    price: sale.total,
                    subtotal: sale.total,
                  }
                ]
              }
            }
          });
        }
      }

      // 3. Process Expenses
      for (const exp of expenses) {
        await tx.expense.upsert({
          where: { offlineId: exp.id },
          create: {
            tenantId,
            offlineId: exp.id,
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            date: new Date(exp.date),
          },
          update: {
            description: exp.description,
            amount: exp.amount,
            category: exp.category,
            date: new Date(exp.date),
          },
        });
      }

      this.logger.log(`Successfully synced ${products.length} products, ${sales.length} sales, ${expenses.length} expenses for tenant ${tenantId}`);

      return { success: true, message: 'Sync completed successfully' };
    });
  }
}
