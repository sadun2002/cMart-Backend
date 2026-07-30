import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkIn(tenantId: number, userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    if (existing?.checkIn) {
      throw new BadRequestException('Already checked in today');
    }

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn: new Date(), status: AttendanceStatus.PRESENT }
      });
    }

    return this.prisma.attendance.create({
      data: {
        tenantId,
        userId,
        date: today,
        checkIn: new Date(),
        status: AttendanceStatus.PRESENT,
      }
    });
  }

  async checkOut(tenantId: number, userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today
        }
      }
    });

    if (!record || !record.checkIn) {
      throw new BadRequestException('You must check in first');
    }

    if (record.checkOut) {
      throw new BadRequestException('Already checked out today');
    }

    const checkInTime = new Date(record.checkIn).getTime();
    const checkOutTime = new Date().getTime();
    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);

    return this.prisma.attendance.update({
      where: { id: record.id },
      data: { 
        checkOut: new Date(),
        hoursWorked 
      }
    });
  }

  async getMyAttendance(tenantId: number, userId: number) {
    return this.prisma.attendance.findMany({
      where: { tenantId, userId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }
}
