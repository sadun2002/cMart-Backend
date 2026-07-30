import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  getCustomers(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.customersService.getCustomers(user.tenantId, search);
  }

  @Post()
  createCustomer(@CurrentUser() user: any, @Body() data: any) {
    return this.customersService.createCustomer(user.tenantId, data);
  }
}
