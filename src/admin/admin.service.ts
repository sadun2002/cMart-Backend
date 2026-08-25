import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

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

    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        suspended: suspend,
        suspendedAt: suspend ? new Date() : null,
        suspendReason: suspend ? reason : null,
        active: !suspend,
        // If un-suspending, clear the fingerprint so they can bind a new device
        hardwareFingerprint: suspend ? undefined : null,
      },
      include: { owner: true }
    });

    if (suspend && updatedTenant.owner) {
      // Send rejection email
      await this.mailService.sendTenantRejected(
        updatedTenant.owner.email,
        updatedTenant.owner.name,
        reason || ''
      );
    } else if (!suspend && updatedTenant.owner) {
      // Send approval email
      const dashboardLink = `http://${updatedTenant.subdomain}.localhost:3000/owner/dashboard`; // Or root URL if we want them to login
      await this.mailService.sendTenantApproved(
        updatedTenant.owner.email,
        updatedTenant.owner.name,
        'http://localhost:3000/login',
        updatedTenant.plan
      );
    }

    return updatedTenant;
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

  async getAllReleases() {
    return this.prisma.release.findMany({
      orderBy: { pub_date: 'desc' },
    });
  }

  async createRelease(data: { version: string; notes?: string; target?: string; url: string; signature: string }) {
    return this.prisma.release.create({
      data: {
        version: data.version,
        notes: data.notes,
        target: data.target || 'windows-x86_64',
        url: data.url,
        signature: data.signature,
      }
    });
  }
}
