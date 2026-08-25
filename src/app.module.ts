import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AdminModule } from './admin/admin.module';
import { ThemesModule } from './themes/themes.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';

import { CustomersModule } from './customers/customers.module';
import { CategoriesModule } from './categories/categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { BranchesModule } from './branches/branches.module';
import { InventoryModule } from './inventory/inventory.module';
import { BannersModule } from './banners/banners.module';
import { StorefrontModule } from './storefront/storefront.module';
import { MailModule } from './mail/mail.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    AdminModule,
    ThemesModule,
    ProductsModule,
    SalesModule,
    EmployeesModule,
    AttendanceModule,
    CustomersModule,
    CategoriesModule,
    SuppliersModule,
    BranchesModule,
    InventoryModule,
    BannersModule,
    StorefrontModule,
    MailModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [
    // Apply JWT guard globally — use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply Roles guard globally
    { provide: APP_GUARD, useClass: RolesGuard },
    // Normalize all responses
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Handle all exceptions consistently
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
