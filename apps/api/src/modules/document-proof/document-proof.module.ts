import { Module } from "@nestjs/common";

import { InstitutionModule } from "../institution/institution.module";
import { DocumentProofAssetsService } from "./document-proof-assets.service";
import {
  DocumentProofController,
  PublicDocumentProofController,
} from "./document-proof.controller";
import { DocumentProofService } from "./document-proof.service";

@Module({
  imports: [InstitutionModule],
  providers: [DocumentProofService, DocumentProofAssetsService],
  controllers: [DocumentProofController, PublicDocumentProofController],
  exports: [DocumentProofService],
})
export class DocumentProofModule {}
