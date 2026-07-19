import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

import { AppConfigService } from '../../config/app-config.service';
import type { JwtPayload } from '../../modules/auth/types/jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        active: true,
        issuerId: true,
        tokenVersion: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin account no longer exists');
    }

    if (!admin.active) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    // Reject tokens issued before the current tokenVersion (password change / force-logout)
    if (payload.tokenVersion !== admin.tokenVersion) {
      throw new UnauthorizedException('Session has been invalidated');
    }

    return {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      issuerId: admin.issuerId,
      tokenVersion: admin.tokenVersion,
      active: admin.active,
    } satisfies JwtPayload;
  }
}
