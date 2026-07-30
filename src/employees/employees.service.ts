import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async getEmployees(tenantId: number) {
    return this.prisma.user.findMany({
      where: { tenantId, role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        lastLogin: true,
      }
    });
  }

  async createEmployee(tenantId: number, data: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });
  }
}
