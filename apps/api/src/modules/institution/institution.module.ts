import { Module } from '@nestjs/common';

import { SigningModule } from '../../common/signing/signing.module';
import { InstitutionController } from './institution.controller';
import { InstitutionPublicController } from './institution-public.controller';
import { InstitutionService } from './institution.service';

@Module({
  imports: [SigningModule],
  controllers: [InstitutionController, InstitutionPublicController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
