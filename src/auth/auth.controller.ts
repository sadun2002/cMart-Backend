import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus, Query, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterStoreDto, RefreshTokenDto, UpdatePlanDto, RegisterCustomerDto, ForgotPasswordDto, ResetPasswordDto, SyncDeviceDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/forgot-password
   * Request a password reset link
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /auth/reset-password
   * Reset password using token
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * POST /auth/login
   * Universal login — works for SuperAdmin, StoreOwner, Employee
   * Returns JWT + role + redirect URL
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/register
   * Store owner registration — creates tenant + subdomain
   */
  @Public()
  @Post('register')
  register(@Body() dto: RegisterStoreDto) {
    return this.authService.registerStore(dto);
  }

  /**
   * POST /auth/register-customer
   * Storefront customer registration
   */
  @Public()
  @Post('register-customer')
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  /**
   * GET /auth/check-subdomain
   * Checks if a subdomain is available
   */
  @Public()
  @Get('check-subdomain')
  checkSubdomain(@Query('subdomain') subdomain: string) {
    return this.authService.checkSubdomainAvailability(subdomain);
  }

  /**
   * GET /auth/me
   * Returns current authenticated user's profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id, user.type);
  }

  /**
   * PATCH /auth/plan
   * Updates the current user's tenant subscription plan
   * [SECURITY AUDIT] In production, this should be a webhook from a payment provider, not a client-callable endpoint.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STORE_OWNER')
  @Patch('plan')
  updatePlan(@CurrentUser() user: any, @Body() dto: UpdatePlanDto) {
    return this.authService.updateTenantPlan(user.id, dto.plan);
  }

  /**
   * POST /auth/sync-device
   * Syncs the hardware fingerprint for the tenant's device binding
   */
  @UseGuards(JwtAuthGuard)
  @Post('sync-device')
  syncDevice(@CurrentUser() user: any, @Body() dto: SyncDeviceDto) {
    return this.authService.syncDevice(user.tenantId, dto.fingerprint);
  }

  /**
   * GET /auth/billing-history
   * Returns current authenticated user's tenant billing history
   */
  @UseGuards(JwtAuthGuard)
  @Get('billing-history')
  getBillingHistory(@CurrentUser() user: any) {
    return this.authService.getBillingHistory(user.tenantId);
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
