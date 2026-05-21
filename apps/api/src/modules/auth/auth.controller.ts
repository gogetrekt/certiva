import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import type { Request } from 'express';

import { GetAdmin } from '../../common/decorators/get-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import type { JwtPayload } from './types/jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit(RATE_LIMIT_RULE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.SUPER_ADMIN)
  register(
    @GetAdmin() actor: JwtPayload,
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ) {
    return this.authService.register(dto, actor, this.resolveContext(req));
  }

  @Post('login')
  @RateLimit(RATE_LIMIT_RULE.AUTH_LOGIN)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.resolveContext(req));
  }

  @Get('me')
  @RateLimit(RATE_LIMIT_RULE.ADMIN)
  @UseGuards(JwtAuthGuard)
  me(@GetAdmin() admin: JwtPayload) {
    return this.authService.getProfile(admin.sub);
  }

  @Get('admins')
  @RateLimit(RATE_LIMIT_RULE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.SUPER_ADMIN)
  listAdmins() {
    return this.authService.listAdmins();
  }

  @Patch('admins/:id')
  @RateLimit(RATE_LIMIT_RULE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.SUPER_ADMIN)
  updateAdmin(
    @GetAdmin() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.authService.updateAdmin(actor, id, dto);
  }

  @Delete('admins/:id')
  @RateLimit(RATE_LIMIT_RULE.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.SUPER_ADMIN)
  deleteAdmin(
    @GetAdmin() admin: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.authService.deleteAdmin(admin, id, this.resolveContext(req));
  }

  private resolveContext(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? undefined;
    return { ipAddress: ip, userAgent };
  }
}
