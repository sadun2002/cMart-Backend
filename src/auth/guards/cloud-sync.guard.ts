import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CloudSyncGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Allow all GET requests (reading data is always allowed, even if frozen)
    if (request.method === 'GET') {
      return true;
    }

    // Skip check for auth routes or webhooks if needed
    if (request.path.includes('/auth/')) {
      return true;
    }

    if (!user || !user.tenantId) {
      return true; // Let JwtAuthGuard handle unauthenticated users
    }

    // Check tenant plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { plan: true }
    });

    if (tenant?.plan === 'STARTUP') {
      throw new ForbiddenException(
        'Cloud sync is disabled for the Free (Startup) plan. Please upgrade to Pro to sync new data to the cloud.'
      );
    }

    return true;
  }
}
