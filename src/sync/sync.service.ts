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
      categories?: any[];
      products?: any[];
      sales?: any[];
      sale_items?: any[];
      expenses?: any[];
      settings?: any[];
    },
  ) {
    this.logger.log(`Starting bulk sync for tenant ${tenantId}`);
    
    const { categories = [], products = [], sales = [], sale_items = [], expenses = [], settings = [] } = payload;

    return this.prisma.$transaction(async (tx) => {
      // 1. Process Categories
      const categoryIdMap = new Map<number, number>(); // SQLite ID -> Postgres ID
      for (const cat of categories) {
        const offId = cat.offlineId || cat.id?.toString();
        if (!offId) continue;
        const categorySlug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
        
        let backendCat = await tx.category.findUnique({
          where: { offlineId: offId },
        });

        if (!backendCat) {
          backendCat = await tx.category.create({
            data: {
              tenantId,
              offlineId: offId,
              name: cat.name,
              slug: categorySlug,
              description: cat.description,
              active: cat.active !== 0,
            },
          });
        } else {
          backendCat = await tx.category.update({
            where: { offlineId: offId },
            data: {
              name: cat.name,
              slug: categorySlug,
              description: cat.description,
              active: cat.active !== 0,
            },
          });
        }
        categoryIdMap.set(cat.id, backendCat.id);
      }

      // 2. Process Products
      const productIdMap = new Map<number, number>(); // SQLite ID -> Postgres ID
      for (const prod of products) {
        const offId = prod.offlineId || prod.id?.toString();
        if (!offId) continue;
        const backendCategoryId = prod.categoryId ? categoryIdMap.get(prod.categoryId) || null : null;
        
        const backendProd = await tx.product.upsert({
          where: { offlineId: offId },
          create: {
            tenantId,
            offlineId: offId,
            name: prod.name,
            sku: prod.sku || null,
            barcode: prod.barcode || null,
            categoryId: backendCategoryId,
            active: prod.active !== 0,
          },
          update: {
            name: prod.name,
            sku: prod.sku || null,
            barcode: prod.barcode || null,
            categoryId: backendCategoryId,
            active: prod.active !== 0,
          },
        });

        // Upsert BranchProduct for the default branch (Branch 1 or derived from context if available)
        // Since sync payload currently might not have branchId array, we assume default branch 1 for now.
        // We need to fetch the first branch of the tenant to associate.
        const defaultBranch = await tx.branch.findFirst({ where: { tenantId } });
        if (defaultBranch) {
          await tx.branchProduct.upsert({
            where: {
              branchId_productId: {
                branchId: defaultBranch.id,
                productId: backendProd.id
              }
            },
            create: {
              tenantId,
              branchId: defaultBranch.id,
              productId: backendProd.id,
              sellingPrice: prod.price || 0,
              wholesalePrice: prod.wholesalePrice || 0,
              costPrice: prod.cost || 0,
              isActive: prod.active !== 0,
            },
            update: {
              sellingPrice: prod.price || 0,
              wholesalePrice: prod.wholesalePrice || 0,
              costPrice: prod.cost || 0,
              isActive: prod.active !== 0,
            }
          });

          // Also upsert inventory
          await tx.inventory.upsert({
            where: {
              branchId_productId: {
                branchId: defaultBranch.id,
                productId: backendProd.id
              }
            },
            create: {
              tenantId,
              branchId: defaultBranch.id,
              productId: backendProd.id,
              quantity: prod.stockQuantity || 0,
            },
            update: {
              quantity: prod.stockQuantity || 0,
            }
          });
        }
        productIdMap.set(prod.id, backendProd.id);
      }

      // 3. Process Sales
      const saleIdMap = new Map<number, number>(); // SQLite ID -> Postgres ID
      for (const sale of sales) {
        const offId = sale.offlineId || sale.id?.toString();
        if (!offId) continue;
        const invoiceNo = `OFF-${offId.slice(0, 8).toUpperCase()}`;
        
        let existingSale = await tx.sale.findUnique({
          where: { offlineId: offId },
        });

        if (!existingSale) {
          existingSale = await tx.sale.create({
            data: {
              tenantId,
              offlineId: offId,
              invoiceNo,
              subtotal: sale.subtotal || sale.total,
              total: sale.total,
              paymentMethod: sale.paymentMethod || 'CASH',
              paymentStatus: sale.paymentStatus || 'COMPLETED',
              userId: userId,
              createdAt: new Date(sale.createdAt || sale.created_at || new Date()),
            }
          });
        }
        saleIdMap.set(sale.id, existingSale.id);
      }

      // 4. Process Sale Items
      for (const item of sale_items) {
        const backendSaleId = saleIdMap.get(item.saleId);
        const backendProductId = productIdMap.get(item.productId);
        
        if (backendSaleId && backendProductId) {
          await tx.saleItem.create({
            data: {
              saleId: backendSaleId,
              productId: backendProductId,
              productName: item.productName || 'Offline Item',
              quantity: item.quantity,
              price: item.price,
              cost: item.cost || 0,
              discount: item.discount || 0,
              subtotal: item.subtotal,
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
