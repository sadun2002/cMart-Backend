import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod } from '@prisma/client';

interface SaleItemDto {
  productId: number;
  quantity: number;
  price: number;
  productName?: string;
}

interface CreateSaleDto {
  items: SaleItemDto[];
  paymentMethod: PaymentMethod;
  amountLKR: number;
  cashierId?: number;
  customerId?: number;
  branchId?: number;
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(tenantId: number, data: CreateSaleDto, userId: number) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify stock for all items
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });
        
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }
        
        if (data.branchId) {
          const inventory = await tx.branchInventory.findUnique({
            where: {
              branchId_productId: {
                branchId: data.branchId,
                productId: item.productId,
              }
            }
          });

          if (!inventory || inventory.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for ${product.name} at branch ${data.branchId}`);
          }

          // 2. Reduce stock
          await tx.branchInventory.update({
            where: { id: inventory.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      // 3. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          tenantId,
          userId: data.cashierId || userId, // The field is called userId in schema
          invoiceNo: `INV-${Date.now()}`,
          subtotal: data.amountLKR,
          total: data.amountLKR,
          paymentMethod: data.paymentMethod,
          customerId: data.customerId,
          branchId: data.branchId,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              productName: item.productName || 'Unknown Product',
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            }))
          }
        },
        include: { items: true }
      });

      // 4. Process Loyalty Points if Customer is assigned
      if (data.customerId) {
        const pointsEarned = Math.floor(data.amountLKR / 100); // 1 point per 100 LKR
        await tx.customer.update({
          where: { id: data.customerId },
          data: {
            totalSpent: { increment: data.amountLKR },
            totalOrders: { increment: 1 },
            points: { increment: pointsEarned }
          }
        });
      }

      return sale;
    });
  }

  async getRecentSales(tenantId: number) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true } },
        customer: true,
        items: true,
      }
    });
  }

  async getMySales(tenantId: number, cashierId: number) {
    return this.prisma.sale.findMany({
      where: { tenantId, userId: cashierId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true } },
      }
    });
  }
}
