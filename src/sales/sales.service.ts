import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod } from '@prisma/client';

interface SaleItemDto {
  productId: number;
  quantity: number;
  price: number; // Will be ignored for security
  productName?: string;
}

interface CreateSaleDto {
  invoiceNo?: string; // Used for Idempotency from offline sync
  items: SaleItemDto[];
  paymentMethod: PaymentMethod;
  amountLKR: number; // Ignored for security, recalculated on backend
  cashierId?: number;
  customerId?: number;
  branchId?: number;
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private prisma: PrismaService) {}

  async createSale(tenantId: number, data: CreateSaleDto, userId: number) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    // [SECURITY] Idempotency Check for Offline Sync
    // If the frontend sends an invoiceNo, we check if it already exists to prevent double-charging.
    let targetInvoiceNo = data.invoiceNo;
    if (targetInvoiceNo) {
      const existingSale = await this.prisma.sale.findUnique({
        where: {
          tenantId_invoiceNo: {
            tenantId,
            invoiceNo: targetInvoiceNo,
          },
        },
        include: { items: true },
      });
      if (existingSale) {
        this.logger.warn(`[SECURITY AUDIT] Idempotent request blocked: Sale ${targetInvoiceNo} already exists for Tenant ${tenantId}`);
        return existingSale; // Return existing to resolve frontend sync gracefully
      }
    } else {
      targetInvoiceNo = `INV-${Date.now()}`;
    }

    // [SECURITY] Multi-Tenant Isolation
    if (data.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: data.branchId, tenantId },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found or does not belong to your store.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let calculatedSubtotal = 0;
      const verifiedItems: any[] = [];

      // 1. Verify stock and calculate REAL prices
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });
        
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }
        
        // [SECURITY] Calculate total using DB Price, completely ignoring client's `item.price`.
        // To allow discounts later, a separate explicit `discount` field must be passed and verified.
        const actualPrice = Number(product.price);
        const lineTotal = actualPrice * item.quantity;
        calculatedSubtotal += lineTotal;

        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          price: actualPrice,
          subtotal: lineTotal,
        });
        
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

      // 3. Create Sale Record with Verified Calculations
      const sale = await tx.sale.create({
        data: {
          tenantId,
          userId: data.cashierId || userId,
          invoiceNo: targetInvoiceNo,
          subtotal: calculatedSubtotal,
          total: calculatedSubtotal, // Assuming no tax/discount in this iteration, else apply logic here
          paymentMethod: data.paymentMethod,
          customerId: data.customerId,
          branchId: data.branchId,
          items: {
            create: verifiedItems,
          }
        },
        include: { items: true }
      });

      this.logger.log(`[SECURITY AUDIT] User ${userId} successfully created Sale ${sale.id} for Tenant ${tenantId} (Total: ${calculatedSubtotal})`);

      // 4. Process Loyalty Points if Customer is assigned
      if (data.customerId) {
        const pointsEarned = Math.floor(calculatedSubtotal / 100); // 1 point per 100 LKR
        await tx.customer.update({
          where: { id: data.customerId, tenantId }, // [SECURITY] Added tenantId to isolation
          data: {
            totalSpent: { increment: calculatedSubtotal },
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
