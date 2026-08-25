import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddAddressDto, AddCardDto, CreateOrderDto } from './dto/storefront.dto';

@UseGuards(JwtAuthGuard)
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.storefrontService.getProfile(user.id);
  }

  @Get('orders')
  getOrders(@CurrentUser() user: any) {
    return this.storefrontService.getOrders(user.id);
  }

  @Post('orders')
  createOrder(@CurrentUser() user: any, @Body() data: CreateOrderDto) {
    return this.storefrontService.createOrder(user.id, user.tenantId, data);
  }

  @Patch('orders/:id/cancel')
  cancelOrder(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.storefrontService.cancelOrder(user.id, id);
  }

  @Patch('orders/:id/return')
  returnOrder(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.storefrontService.returnOrder(user.id, id);
  }

  @Get('addresses')
  getAddresses(@CurrentUser() user: any) {
    return this.storefrontService.getAddresses(user.id);
  }

  @Post('addresses')
  addAddress(@CurrentUser() user: any, @Body() data: AddAddressDto) {
    return this.storefrontService.addAddress(user.id, data);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.storefrontService.deleteAddress(user.id, id);
  }

  @Get('cards')
  getCards(@CurrentUser() user: any) {
    return this.storefrontService.getCards(user.id);
  }

  @Post('cards')
  addCard(@CurrentUser() user: any, @Body() data: AddCardDto) {
    return this.storefrontService.addCard(user.id, data);
  }

  @Delete('cards/:id')
  deleteCard(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.storefrontService.deleteCard(user.id, id);
  }

  // --- Admin / Store Owner Endpoints ---

  @Get('admin/customers')
  getStoreCustomers(@CurrentUser() user: any) {
    return this.storefrontService.getStoreCustomers(user.tenantId);
  }

  @Get('admin/orders')
  getStoreOrders(@CurrentUser() user: any) {
    return this.storefrontService.getStoreOrders(user.tenantId);
  }

  @Patch('admin/orders/:id')
  updateStoreOrderStatus(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('paymentStatus') paymentStatus: string,
  ) {
    return this.storefrontService.updateStoreOrderStatus(user.tenantId, id, status, paymentStatus);
  }

  @Delete('admin/orders/:id')
  deleteStoreOrder(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.storefrontService.deleteStoreOrder(user.tenantId, id);
  }
}
