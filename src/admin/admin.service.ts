import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const totalTenants = await this.prisma.tenant.count();
    const activeTenants = await this.prisma.tenant.count({
      where: { active: true, suspended: false },
    });
    
    const totalUsers = await this.prisma.user.count();
    
    const revenueAggr = await this.prisma.subscriptionPayment.aggregate({
      _sum: {
        amountLKR: true,
      },
      where: {
        status: PaymentStatus.COMPLETED,
      },
    });

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalRevenueLKR: revenueAggr._sum.amountLKR ? Number(revenueAggr._sum.amountLKR) : 0,
    };
  }

  async getAllStores() {
    return this.prisma.tenant.findMany({
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStoreStatus(id: number, suspend: boolean, reason?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Store not found');

    return this.prisma.tenant.update({
      where: { id },
      data: {
        suspended: suspend,
        suspendedAt: suspend ? new Date() : null,
        suspendReason: suspend ? reason : null,
        active: !suspend,
      },
    });
  }

  async getPayments() {
    return this.prisma.subscriptionPayment.findMany({
      include: {
        subscription: {
          include: {
            tenant: {
              select: { id: true, businessName: true, subdomain: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
