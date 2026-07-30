import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  getEmployees(@CurrentUser() user: any) {
    return this.employeesService.getEmployees(user.tenantId);
  }

  @Post()
  createEmployee(@CurrentUser() user: any, @Body() data: any) {
    return this.employeesService.createEmployee(user.tenantId, data);
  }
}
