import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getBranches(tenantId: number) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async createBranch(tenantId: number, data: any) {
    return this.prisma.branch.create({
      data: {
        ...data,
        tenantId
      }
    });
  }

  async updateBranch(tenantId: number, id: number, data: any) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId }
    });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.branch.update({
      where: { id },
      data
    });
  }

  async deleteBranch(tenantId: number, id: number) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId }
    });
    if (!branch) throw new NotFoundException('Branch not found');

    return this.prisma.branch.delete({
      where: { id }
    });
  }
}
