import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import QRCode from "qrcode";

import { AppConfigService } from "../../config/app-config.service";

interface DocumentProofIssuer {
  id: string;
  name: string;
  displayName: string | null;
  domain: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: string;
}

export interface DocumentProofAssetRecord {
  id: string;
  verificationId: string;
  verificationCode: string;
  signedVerificationToken: string;
  title: string;
  documentType: string;
  referenceNumber: string | null;
  documentDate: Date | null;
  sourceHash: string;
  issuer: DocumentProofIssuer;
}

export interface DocumentProofMetadataDocument {
  version: 1;
  proofId: string;
  verificationId: string;
  verificationCode: string;
  signedVerificationToken: string;
  title: string;
  documentType: string;
  referenceNumber: string | null;
  documentDate: string | null;
  sourceHash: string;
  qrPayload: string;
  proofUrl: string;
  metadataUri: string;
  qrCodeUri: string;
  issuer: DocumentProofIssuer;
}

export interface DocumentProofAssetBundle {
  metadata: DocumentProofMetadataDocument;
  metadataUri: string;
  qrCodeUri: string;
  proofUrl: string;
}

@Injectable()
export class DocumentProofAssetsService {
  constructor(private readonly configService: AppConfigService) {}

  async generateAndPersist(
    record: DocumentProofAssetRecord,
  ): Promise<DocumentProofAssetBundle> {
    const bundle = this.buildBundle(record);
    const qrCodePng = await QRCode.toBuffer(bundle.metadata.qrPayload, {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#1f2937",
        light: "#ffffff",
      },
    });

    const directory = this.getProofDirectory(record.id);
    await mkdir(directory, { recursive: true });
    await Promise.all([
      writeFile(
        this.getAssetPath(record.id, "metadata"),
        JSON.stringify(bundle.metadata, null, 2),
        "utf8",
      ),
      writeFile(this.getAssetPath(record.id, "qr"), qrCodePng),
    ]);

    return bundle;
  }

  async readMetadata(proofId: string) {
    return readFile(this.getAssetPath(proofId, "metadata"), "utf8");
  }

  async readQrCode(proofId: string) {
    return readFile(this.getAssetPath(proofId, "qr"));
  }

  buildBundle(record: DocumentProofAssetRecord): DocumentProofAssetBundle {
    const metadataUri = `${this.getApiBaseUrl()}/document-proofs/${encodeURIComponent(record.id)}/metadata`;
    const qrCodeUri = `${this.getApiBaseUrl()}/document-proofs/${encodeURIComponent(record.id)}/qr`;
    const proofUrl = `${this.getWebBaseUrl()}/proof/${encodeURIComponent(record.verificationId)}`;
    const qrPayload = this.buildQrPayload(
      proofUrl,
      record.signedVerificationToken,
    );

    return {
      metadataUri,
      qrCodeUri,
      proofUrl,
      metadata: {
        version: 1,
        proofId: record.id,
        verificationId: record.verificationId,
        verificationCode: record.verificationCode,
        signedVerificationToken: record.signedVerificationToken,
        title: record.title,
        documentType: record.documentType,
        referenceNumber: record.referenceNumber,
        documentDate: record.documentDate?.toISOString() ?? null,
        sourceHash: record.sourceHash,
        qrPayload,
        proofUrl,
        metadataUri,
        qrCodeUri,
        issuer: record.issuer,
      },
    };
  }

  resolveMetadataUri(proofId: string, value?: string | null) {
    return value?.trim() || `${this.getApiBaseUrl()}/document-proofs/${encodeURIComponent(proofId)}/metadata`;
  }

  resolveQrCodeUri(proofId: string, value?: string | null) {
    return value?.trim() || `${this.getApiBaseUrl()}/document-proofs/${encodeURIComponent(proofId)}/qr`;
  }

  resolveProofUrl(verificationId: string, value?: string | null) {
    return value?.trim() || `${this.getWebBaseUrl()}/proof/${encodeURIComponent(verificationId)}`;
  }

  private buildQrPayload(proofUrl: string, signedVerificationToken: string) {
    const url = new URL(proofUrl);
    url.searchParams.set("token", signedVerificationToken);
    return url.toString();
  }

  private getApiBaseUrl() {
    return this.configService.apiPublicBaseUrl.replace(/\/+$/, "");
  }

  private getWebBaseUrl() {
    return this.configService.webPublicBaseUrl.replace(/\/+$/, "");
  }

  private getAssetRoot() {
    const configured = this.configService.assetStorageRoot;
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }

  private getProofDirectory(proofId: string) {
    return join(this.getAssetRoot(), "document-proofs", proofId);
  }

  private getAssetPath(proofId: string, kind: "metadata" | "qr") {
    const directory = this.getProofDirectory(proofId);
    return join(
      directory,
      kind === "metadata" ? "metadata.json" : "verification-qr.png",
    );
  }
}
