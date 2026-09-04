import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getBranchInventory(tenantId: number, branchId: number) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: {
        images: true,
        category: true,
        branchProducts: { where: { branchId } },
        inventories: { where: { branchId } }
      }
    });

    // Map to the format the frontend expects (or similar)
    return products.map(p => ({
      ...p,
      branchProduct: p.branchProducts[0] || null,
      inventory: p.inventories[0] || null,
      stock: p.inventories[0]?.quantity || 0,
      price: p.branchProducts[0]?.sellingPrice || 0,
      cost: p.branchProducts[0]?.costPrice || 0
    }));
  }

  async stockAdjustment(tenantId: number, branchId: number, data: any) {
    const { productId, quantity, type, price, cost } = data; // type: 'IN', 'OUT', 'SET'

    // 1. Handle Inventory (Stock)
    let inventory = await this.prisma.inventory.findUnique({
      where: { branchId_productId: { branchId, productId } }
    });

    if (!inventory) {
      if (type === 'OUT') throw new NotFoundException('Product not in branch inventory');
      
      inventory = await this.prisma.inventory.create({
        data: {
          tenantId,
          branchId,
          productId,
          quantity: type === 'IN' || type === 'SET' ? quantity : 0,
        }
      });
    } else {
      let newStock = inventory.quantity;
      if (type === 'IN') newStock += quantity;
      else if (type === 'OUT') newStock = Math.max(0, newStock - quantity);
      else if (type === 'SET') newStock = quantity;

      inventory = await this.prisma.inventory.update({
        where: { id: inventory.id },
        data: { quantity: newStock }
      });
    }

    // 2. Handle BranchProduct (Price/Cost)
    let branchProduct = await this.prisma.branchProduct.findUnique({
      where: { branchId_productId: { branchId, productId } }
    });

    if (!branchProduct) {
      branchProduct = await this.prisma.branchProduct.create({
        data: {
          tenantId,
          branchId,
          productId,
          sellingPrice: price || 0,
          costPrice: cost || 0,
        }
      });
    } else {
      branchProduct = await this.prisma.branchProduct.update({
        where: { id: branchProduct.id },
        data: {
          sellingPrice: price !== undefined ? price : branchProduct.sellingPrice,
          costPrice: cost !== undefined ? cost : branchProduct.costPrice,
        }
      });
    }

    return { inventory, branchProduct };
  }
}
