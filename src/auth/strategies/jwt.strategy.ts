import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  email: string;
  type: 'super_admin' | 'user'; // which table this user comes from
  role?: string;       // UserRole for users
  adminRole?: string;  // AdminRole for super admins
  tenantId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    console.log('[JwtStrategy] Validating payload:', payload);
    if (payload.type === 'super_admin') {
      const admin = await this.prisma.superAdmin.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, active: true },
      });
      if (!admin || !admin.active) {
        console.error('[JwtStrategy] SuperAdmin not found or inactive');
        throw new UnauthorizedException('Admin not found or inactive');
      }
      return { ...admin, adminRole: admin.role, type: 'super_admin' };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        active: true,
        employee: {
          select: { permissions: true, position: true, employeeCode: true },
        },
      },
    });

    if (!user) {
      console.error('[JwtStrategy] User not found for ID:', payload.sub);
      throw new UnauthorizedException('User not found');
    }
    if (!user.active) {
      console.error('[JwtStrategy] User is inactive:', payload.sub);
      throw new UnauthorizedException('User is inactive');
    }
    return { ...user, type: 'user' };
  }
}
