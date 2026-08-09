import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getBranchInventory(tenantId: number, branchId: number) {
    return this.prisma.branchInventory.findMany({
      where: { tenantId, branchId },
      include: {
        product: {
          include: { images: true, category: true }
        }
      }
    });
  }

  async stockAdjustment(tenantId: number, branchId: number, data: any) {
    const { productId, quantity, type, price, cost } = data; // type: 'IN', 'OUT', 'SET'

    let inventory = await this.prisma.branchInventory.findUnique({
      where: { branchId_productId: { branchId, productId } }
    });

    if (!inventory) {
      if (type === 'OUT') throw new NotFoundException('Product not in branch inventory');
      
      // Create new inventory record
      inventory = await this.prisma.branchInventory.create({
        data: {
          tenantId,
          branchId,
          productId,
          stock: type === 'IN' || type === 'SET' ? quantity : 0,
          price: price || 0,
          cost: cost || 0,
        }
      });
      return inventory;
    }

    // Update existing inventory
    let newStock = inventory.stock;
    if (type === 'IN') newStock += quantity;
    else if (type === 'OUT') newStock = Math.max(0, newStock - quantity);
    else if (type === 'SET') newStock = quantity;

    return this.prisma.branchInventory.update({
      where: { id: inventory.id },
      data: {
        stock: newStock,
        price: price !== undefined ? price : inventory.price,
        cost: cost !== undefined ? cost : inventory.cost,
      }
    });
  }
}
