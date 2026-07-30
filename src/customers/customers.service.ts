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

  async createCustomer(tenantId: number, data: { name: string; phone?: string; email?: string }) {
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
      },
    });
  }
}
