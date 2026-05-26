import { Module } from "@nestjs/common";

import { StorageModule } from "../../common/storage/storage.module";
import { InstitutionModule } from "../institution/institution.module";
import { DocumentProofAssetsService } from "./document-proof-assets.service";
import {
  DocumentProofController,
  PublicDocumentProofController,
} from "./document-proof.controller";
import { DocumentProofService } from "./document-proof.service";

@Module({
  imports: [StorageModule, InstitutionModule],
  providers: [DocumentProofService, DocumentProofAssetsService],
  controllers: [DocumentProofController, PublicDocumentProofController],
  exports: [DocumentProofService],
})
export class DocumentProofModule {}
