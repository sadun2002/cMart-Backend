import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async getSuppliers(tenantId: number, search?: string) {
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSupplier(tenantId: number, data: any) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: data.name,
        contactPerson: data.contactPerson,
        contactPersonPhone: data.contactPersonPhone,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        notes: data.notes,
        active: data.active ?? true,
      },
    });
  }

  async updateSupplier(tenantId: number, id: number, data: any) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        contactPersonPhone: data.contactPersonPhone,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        notes: data.notes,
        active: data.active,
      },
    });
  }

  async deleteSupplier(tenantId: number, id: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
