import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterStoreDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { TRIAL_DAYS, DEFAULT_CASHIER_PERMISSIONS } from '../common/constants';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

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
        tenant: { select: { id: true, businessName: true, subdomain: true, active: true, suspended: true } },
        employee: { select: { permissions: true, position: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is deactivated');
    if (user.tenant?.suspended) throw new UnauthorizedException('Your store has been suspended. Contact support.');

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

    const redirectTo =
      user.role === UserRole.STORE_OWNER
        ? '/owner/dashboard'
        : '/employee/dashboard';

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
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('Email already registered');

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
          plan: 'FREE',
          status: 'TRIAL',
          trialEndDate: trialEndsAt,
        },
      });

      return { user, tenant };
    });

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
        tenant: { select: { id: true, businessName: true, subdomain: true, plan: true, active: true } },
        employee: { select: { permissions: true, position: true, employeeCode: true } },
      },
    });
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
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
