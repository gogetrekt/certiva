import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ADMIN_ROLE,
  AUDITOR_ROLE,
  OWNER_ROLE,
  SUPER_ADMIN_ROLE,
} from '../../common/auth/admin-role.constants';
import { GetAdmin } from '../../common/decorators/get-admin.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CredentialService } from './credential.service';
import { BulkDeleteCredentialsDto } from './dto/bulk-delete-credentials.dto';
import { BulkIssueCredentialsDto } from './dto/bulk-issue-credentials.dto';
import { BulkRevokeCredentialsDto } from './dto/bulk-revoke-credentials.dto';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { ListCredentialsDto } from './dto/list-credentials.dto';
import { RevokeCredentialDto } from './dto/revoke-credential.dto';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Controller('credentials')
@RateLimit(RATE_LIMIT_RULE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Post()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE)
  create(@GetAdmin() admin: JwtPayload, @Body() dto: CreateCredentialDto) {
    return this.credentialService.create(admin, dto);
  }

  @Post('bulk')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE)
  bulkIssue(
    @GetAdmin() admin: JwtPayload,
    @Body() dto: BulkIssueCredentialsDto,
  ) {
    return this.credentialService.bulkIssue(admin, dto);
  }

  @Post('bulk-revoke')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  bulkRevoke(@GetAdmin() admin: JwtPayload, @Body() dto: BulkRevokeCredentialsDto) {
    return this.credentialService.bulkRevoke(admin, dto.ids, dto.reason, dto.notes);
  }

  @Post('bulk-delete')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  bulkDelete(@GetAdmin() admin: JwtPayload, @Body() dto: BulkDeleteCredentialsDto) {
    return this.credentialService.bulkDelete(admin, dto.ids);
  }

  @Get()
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  list(@GetAdmin() admin: JwtPayload, @Query() query: ListCredentialsDto) {
    return this.credentialService.list(admin, query);
  }

  @Get(':id')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE, AUDITOR_ROLE)
  findById(@GetAdmin() admin: JwtPayload, @Param('id') id: string) {
    return this.credentialService.findById(admin, id);
  }

  @Delete(':id')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  remove(@GetAdmin() admin: JwtPayload, @Param('id') id: string) {
    return this.credentialService.remove(admin, id);
  }

  @Patch(':id/revoke')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE)
  revoke(
    @GetAdmin() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RevokeCredentialDto,
  ) {
    return this.credentialService.revoke(admin, id, dto);
  }

  @Post(':id/rebuild-assets')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE)
  rebuildAssets(@GetAdmin() admin: JwtPayload, @Param('id') id: string) {
    return this.credentialService.rebuildAssets(admin, id);
  }

  @Post(':id/secure-pdf')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE)
  @UseInterceptors(FileInterceptor('file'))
  registerSecurePdf(
    @GetAdmin() admin: JwtPayload,
    @Param('id') id: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname?: string;
    },
  ) {
    return this.credentialService.registerSecurePdf(admin, id, file);
  }
}

@Controller('batches')
@RateLimit(RATE_LIMIT_RULE.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class BatchController {
  constructor(private readonly credentialService: CredentialService) {}

  @Post(':id/secure-pdf')
  @Roles(OWNER_ROLE, SUPER_ADMIN_ROLE, ADMIN_ROLE)
  @UseInterceptors(FileInterceptor('file'))
  registerBatchSecurePdf(
    @GetAdmin() admin: JwtPayload,
    @Param('id') id: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      size: number;
      mimetype: string;
      originalname?: string;
    },
  ) {
    return this.credentialService.registerBatchSecurePdf(admin, id, file);
  }
}
