import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('checkin')
  checkIn(@CurrentUser() user: any) {
    return this.attendanceService.checkIn(user.tenantId, user.id);
  }

  @Post('checkout')
  checkOut(@CurrentUser() user: any) {
    return this.attendanceService.checkOut(user.tenantId, user.id);
  }

  @Get('me')
  getMyAttendance(@CurrentUser() user: any) {
    return this.attendanceService.getMyAttendance(user.tenantId, user.id);
  }
}
