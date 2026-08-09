import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(tenantId: number, search?: string) {
    if (search) {
      return this.prisma.customer.findMany({
        where: {
          tenantId,
          active: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        },
        orderBy: { name: 'asc' },
        take: 20,
      });
    }

    return this.prisma.customer.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async createCustomer(tenantId: number, data: any) {
    if (!data.name) {
      throw new BadRequestException('Customer name is required');
    }

    if (data.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, phone: data.phone },
      });
      if (existing) {
        throw new BadRequestException('A customer with this phone number already exists');
      }
    }

    return this.prisma.customer.create({
      data: {
        tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        province: data.province,
        customerGroup: data.customerGroup || 'REGULAR',
        dateOfBirth: data.dateOfBirth,
        gender: data.gender || 'OTHER',
        notes: data.notes,
        openingBalance: data.openingBalance ? Number(data.openingBalance) : 0,
        creditLimit: data.creditLimit ? Number(data.creditLimit) : 0,
        paymentTerms: data.paymentTerms || 'CASH',
        loyaltyEnabled: Boolean(data.loyaltyEnabled),
        active: data.active !== false,
      },
    });
  }

  async updateCustomer(tenantId: number, id: number, data: any) {
    // Check if phone belongs to another customer
    if (data.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, phone: data.phone, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException('Another customer with this phone number already exists');
      }
    }

    const updateData: any = { ...data };
    if (data.openingBalance !== undefined) updateData.openingBalance = Number(data.openingBalance);
    if (data.creditLimit !== undefined) updateData.creditLimit = Number(data.creditLimit);
    if (data.loyaltyEnabled !== undefined) updateData.loyaltyEnabled = Boolean(data.loyaltyEnabled);
    if (data.active !== undefined) updateData.active = Boolean(data.active);

    return this.prisma.customer.update({
      where: { id, tenantId },
      data: updateData,
    });
  }

  async deleteCustomer(tenantId: number, id: number) {
    return this.prisma.customer.delete({
      where: { id, tenantId },
    });
  }
}
