import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';

import { CommonModule } from './common/common.module';
import { RateLimitModule } from './common/rate-limit';
import { AppConfigModule } from './config/app-config.module';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.schema';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CredentialModule } from './modules/credential/credential.module';
import { DocumentProofModule } from './modules/document-proof/document-proof.module';
import { HealthModule } from './modules/health/health.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { VerificationModule } from './modules/verification/verification.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '../../.env'),
      ],
      load: [configuration],
      validate: validateEnv,
    }),
    AppConfigModule,
    CommonModule,
    RateLimitModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    InstitutionModule,
    CredentialModule,
    DocumentProofModule,
    VerificationModule,
    AuditModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
