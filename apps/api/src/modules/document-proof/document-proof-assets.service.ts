import { Injectable } from "@nestjs/common";
import QRCode from "qrcode";

import { StorageService } from "../../common/storage/storage.service";
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
  constructor(
    private readonly configService: AppConfigService,
    private readonly storage: StorageService,
  ) {}

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

    await Promise.all([
      this.storage.put(
        this.getAssetKey(record.id, "metadata"),
        JSON.stringify(bundle.metadata, null, 2),
        "application/json",
      ),
      this.storage.put(this.getAssetKey(record.id, "qr"), qrCodePng, "image/png"),
    ]);

    return bundle;
  }

  async readMetadata(proofId: string) {
    return this.storage.getText(this.getAssetKey(proofId, "metadata"));
  }

  async readQrCode(proofId: string) {
    return this.storage.get(this.getAssetKey(proofId, "qr"));
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
    const stored = value?.trim();
    const apiBase = this.getApiBaseUrl();
    if (stored && stored.startsWith(apiBase)) {
      return stored;
    }
    return `${apiBase}/document-proofs/${encodeURIComponent(proofId)}/metadata`;
  }

  resolveQrCodeUri(proofId: string, value?: string | null) {
    const stored = value?.trim();
    const apiBase = this.getApiBaseUrl();
    if (stored && stored.startsWith(apiBase)) {
      return stored;
    }
    return `${apiBase}/document-proofs/${encodeURIComponent(proofId)}/qr`;
  }

  resolveProofUrl(verificationId: string, value?: string | null) {
    const stored = value?.trim();
    const webBase = this.getWebBaseUrl();
    if (stored && stored.startsWith(`${webBase}/proof/${verificationId}`)) {
      return stored;
    }
    return `${webBase}/proof/${encodeURIComponent(verificationId)}`;
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

  private getProofPrefix(proofId: string) {
    return `document-proofs/${proofId}`;
  }

  private getAssetKey(proofId: string, kind: "metadata" | "qr") {
    const prefix = this.getProofPrefix(proofId);
    return kind === "metadata" ? `${prefix}/metadata.json` : `${prefix}/verification-qr.png`;
  }
}
