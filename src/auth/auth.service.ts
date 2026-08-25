import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterStoreDto, UpdatePlanDto, RegisterCustomerDto, ResetPasswordDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import { JwtPayload } from './strategies/jwt.strategy';
import { TRIAL_DAYS, DEFAULT_CASHIER_PERMISSIONS } from '../common/constants';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { email } });
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!admin && !user) {
      throw new BadRequestException('Email does not exist');
    }
    
    const account = admin || user;
    const type = admin ? 'super_admin' : 'user';

    const token = this.jwtService.sign(
      { sub: account!.id, email: account!.email, type, action: 'reset_password' },
      { expiresIn: '15m' }
    );

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    
    // In production, send this via email. For now, log it and return it in response for dev purposes.
    console.log(`[DEV ONLY] Password Reset Link for ${email}: ${resetLink}`);
    
    // Send real email
    await this.mailService.sendForgotPassword(account!.email, account!.name, resetLink);

    return { success: true, message: 'Reset link sent' };
  }

  // ─────────────────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(dto.token);
      if (payload.action !== 'reset_password') {
        throw new BadRequestException('Invalid token');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      if (payload.type === 'super_admin') {
        await this.prisma.superAdmin.update({
          where: { id: payload.sub },
          data: { password: hashedPassword }
        });
      } else {
        await this.prisma.user.update({
          where: { id: payload.sub },
          data: { password: hashedPassword }
        });
      }

      return { success: true, message: 'Password updated successfully' };
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  // ─────────────────────────────────────────────────────────
  // UNIVERSAL LOGIN — detects if it's a super admin or user
  // ─────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    // 1. Try super admin table first
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: dto.email },
    });

    if (admin) {
      const valid = await bcrypt.compare(dto.password, admin.password);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
      if (!admin.active) throw new UnauthorizedException('Account is deactivated');

      await this.prisma.superAdmin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() },
      });

      const tokens = await this.generateTokens({
        sub: admin.id,
        email: admin.email,
        type: 'super_admin',
        adminRole: admin.role,
      });

      return {
        ...tokens,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: 'super_admin',
          adminRole: admin.role,
        },
        redirectTo: '/admin/dashboard',
      };
    }

    // 2. Try user table (store owners, employees)
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenant: { 
          select: { 
            id: true, 
            businessName: true, 
            subdomain: true, 
            plan: true, 
            active: true, 
            suspended: true,
            suspendReason: true,
            subscription: { select: { plan: true, status: true, startDate: true, trialEndDate: true, nextBillingDate: true, endDate: true } }
          } 
        },
        employee: { select: { permissions: true, position: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is deactivated');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: 'user',
      role: user.role,
      tenantId: user.tenantId ?? undefined,
    });

    let redirectTo = '/employee/dashboard';
    if (user.role === UserRole.STORE_OWNER) redirectTo = '/owner/dashboard';
    else if (user.role === UserRole.CUSTOMER) redirectTo = 'storefront'; // Handled by frontend router

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant,
        permissions: user.employee?.permissions ?? null,
      },
      redirectTo,
    };
  }

  async checkSubdomainAvailability(subdomain: string) {
    if (!subdomain || subdomain.length < 3) return { available: false };
    const subdomainClean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const existing = await this.prisma.tenant.findUnique({ where: { subdomain: subdomainClean } });
    return { available: !existing };
  }

  // ─────────────────────────────────────────────────────────
  // STORE OWNER REGISTRATION — creates tenant + subscription
  // ─────────────────────────────────────────────────────────
  async registerStore(dto: RegisterStoreDto) {
    // Check email uniqueness
    const existingUser = await this.prisma.user.findUnique({ 
      where: { email: dto.email },
      include: { tenant: true }
    });
    if (existingUser) {
      if (existingUser.tenant?.suspended) {
        throw new ConflictException('This email was previously registered but the store request was rejected. Please contact support.');
      }
      throw new ConflictException('Email already registered. Please log in to your account.');
    }

    // Check subdomain uniqueness
    const subdomainClean = dto.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (subdomainClean.length < 3) throw new BadRequestException('Subdomain must be at least 3 characters');

    const existingTenant = await this.prisma.tenant.findUnique({ where: { subdomain: subdomainClean } });
    if (existingTenant) throw new ConflictException('Subdomain already taken');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Transaction: create user + tenant + settings + subscription
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: UserRole.STORE_OWNER,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          businessName: dto.businessName,
          businessType: dto.businessType,
          subdomain: subdomainClean,
          ownerId: user.id,
          trialEndsAt,
          active: false,
          users: { connect: { id: user.id } },
        },
      });

      // Update user with tenantId
      await tx.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
      });

      // Default settings
      await tx.tenantSettings.create({
        data: { tenantId: tenant.id },
      });

      // Trial subscription
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: 'STARTUP',
          billingCycle: 'MONTHLY',
          status: 'TRIAL',
          trialEndDate: trialEndsAt,
        },
      });

      return { user, tenant };
    });

    // Send pending approval email
    await this.mailService.sendTenantPending(result.user.email, result.user.name);

    const tokens = await this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      type: 'user',
      role: UserRole.STORE_OWNER,
      tenantId: result.tenant.id,
    });

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: 'STORE_OWNER',
        tenantId: result.tenant.id,
        tenant: { 
          id: result.tenant.id, 
          businessName: result.tenant.businessName, 
          subdomain: result.tenant.subdomain,
          active: result.tenant.active 
        },
      },
      redirectTo: '/pending',
    };
  }

  // ─────────────────────────────────────────────────────────
  // STOREFRONT CUSTOMER REGISTRATION
  // ─────────────────────────────────────────────────────────
  async registerCustomer(dto: RegisterCustomerDto) {
    const subdomainClean = dto.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain: subdomainClean },
    });

    if (!tenant) throw new BadRequestException('Store not found');

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: UserRole.CUSTOMER,
        tenantId: tenant.id,
      },
    });

    // Also create a Customer record for the store's CRM
    await this.prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        email: dto.email,
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      type: 'user',
      role: UserRole.CUSTOMER,
      tenantId: tenant.id,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'CUSTOMER',
        tenantId: tenant.id,
      },
      redirectTo: 'storefront',
    };
  }

  // ─────────────────────────────────────────────────────────
  // GET CURRENT USER
  // ─────────────────────────────────────────────────────────
  async getMe(userId: number, type: 'super_admin' | 'user') {
    if (type === 'super_admin') {
      return this.prisma.superAdmin.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
      });
    }
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true, phone: true, avatar: true,
        tenantId: true, createdAt: true,
        tenant: { 
          select: { 
            id: true, businessName: true, subdomain: true, plan: true, active: true, suspended: true, suspendReason: true,
            subscription: { select: { plan: true, status: true, startDate: true, trialEndDate: true, nextBillingDate: true, endDate: true } }
          } 
        },
        employee: { select: { permissions: true, position: true, employeeCode: true } },
      },
    });
  }

  async updateTenantPlan(userId: number, plan: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true, email: true, name: true },
    });

    if (!user || !user.tenantId) {
      throw new BadRequestException('Tenant not found');
    }

    const currentSub = await this.prisma.subscription.findUnique({
      where: { tenantId: user.tenantId },
    });

    let cloudRetentionUntil: Date | null | undefined = undefined;
    if (plan === 'STARTUP' && currentSub?.plan !== 'STARTUP') {
      // Downgrading to STARTUP: Give 90 days of cloud retention before deletion
      cloudRetentionUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    } else if (plan !== 'STARTUP') {
      // Upgrading to PRO or ENTERPRISE: Clear retention (restore active sync)
      cloudRetentionUntil = null;
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { 
        plan: plan as any,
        cloudRetentionUntil: cloudRetentionUntil
      },
      select: { id: true, businessName: true, subdomain: true, plan: true, active: true },
    });

    await this.prisma.subscription.upsert({
      where: { tenantId: user.tenantId },
      update: { plan: plan as any, status: 'ACTIVE' },
      create: { tenantId: user.tenantId, plan: plan as any, status: 'ACTIVE' },
    });

    if (currentSub && currentSub.plan !== plan) {
      const oldPlan = currentSub.plan;
      let action: 'upgraded' | 'downgraded' | 'cancelled' = 'upgraded';
      if (plan === 'CANCELLED') {
        action = 'cancelled';
      } else if (
        (oldPlan === 'ENTERPRISE' && (plan === 'PRO' || plan === 'STARTUP')) ||
        (oldPlan === 'PRO' && plan === 'STARTUP')
      ) {
        action = 'downgraded';
      }
      
      const logger = new Logger('AuthService');
      logger.log(`[SECURITY AUDIT] User ${userId} ${action} Tenant ${user.tenantId} plan from ${oldPlan} to ${plan}`);
      
      await this.mailService.sendSubscriptionUpdate(user.email, user.name, plan, action);
    }

    return { tenant: updatedTenant };
  }

  // ─────────────────────────────────────────────────────────
  // BILLING HISTORY
  // ─────────────────────────────────────────────────────────
  async getBillingHistory(tenantId: number) {
    if (!tenantId) return [];

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      select: { id: true },
    });

    if (!subscription) return [];

    return this.prisma.subscriptionPayment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────
  // SYNC DEVICE (HARDWARE FINGERPRINT)
  // ─────────────────────────────────────────────────────────
  async syncDevice(tenantId: number, fingerprint: string) {
    if (!tenantId) throw new BadRequestException('Tenant required');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });

    if (!tenant) throw new BadRequestException('Tenant not found');

    // Update last sync date
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { lastSyncDate: new Date() },
    });

    if (tenant.plan === 'STARTUP') {
      if (!tenant.hardwareFingerprint) {
        // First time syncing, save the fingerprint
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: { hardwareFingerprint: fingerprint },
        });
      } else if (tenant.hardwareFingerprint !== fingerprint) {
        // Hardware mismatch! Lock the account
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            suspended: true,
            suspendReason: 'Hardware Fingerprint Mismatch. Contact Super Admin.',
            suspendedAt: new Date(),
          },
        });
        throw new UnauthorizedException('Hardware mismatch detected. Account suspended.');
      }
    }

    const sub = tenant.subscription;
    const endDate = sub?.endDate || sub?.nextBillingDate || sub?.trialEndDate || null;

    let cloudRetentionDaysLeft: number | null = null;
    if (tenant.plan === 'STARTUP' && tenant.cloudRetentionUntil) {
      const msLeft = tenant.cloudRetentionUntil.getTime() - Date.now();
      cloudRetentionDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    }

    return { 
      success: true, 
      subscriptionEndDate: endDate,
      cloudRetentionDaysLeft
    };
  }

  // ─────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      return this.generateTokens(payload);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────
  private async generateTokens(payload: JwtPayload) {
    const cleanPayload = {
      sub: payload.sub,
      email: payload.email,
      type: payload.type,
      role: payload.role,
      adminRole: payload.adminRole,
      tenantId: payload.tenantId,
    };

    return {
      accessToken: await this.jwtService.signAsync(cleanPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      refreshToken: await this.jwtService.signAsync(cleanPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    };
  }
}
