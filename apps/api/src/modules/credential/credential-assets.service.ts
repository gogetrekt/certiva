import { Injectable } from "@nestjs/common";
import { isAbsolute, join, resolve } from "node:path";
import QRCode from "qrcode";

import { StorageService } from "../../common/storage/storage.service";
import { hashBuffer } from "../../common/utils/hash.util";
import { AppConfigService } from "../../config/app-config.service";
import { generateCredentialCertificatePdf } from "./credential-certificate";

interface CredentialAssetIssuer {
  id: string;
  name: string;
  displayName: string | null;
  domain: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: string;
}

export interface CredentialAssetRecord {
  id: string;
  credentialExternalId: string;
  verificationId: string;
  studentName: string;
  studentId: string;
  degree: string;
  issuedAt: Date;
  revoked: boolean;
  revokedAt: Date | null;
  revocationReason: string | null;
  verificationCode: string;
  signedVerificationToken: string;
  securePdfEnabled: boolean;
  documentHash: string | null;
  issuer: CredentialAssetIssuer;
}

export interface CredentialMetadataDocument {
  version: 1;
  credentialId: string;
  verificationId: string;
  studentName: string;
  studentId: string;
  degree: string;
  issuedAt: string;
  verificationCode: string;
  signedVerificationToken: string;
  qrPayload: string;
  verificationMode: "CORE_REGISTRY" | "SECURE_PDF";
  securePdfEnabled: boolean;
  documentHash: string | null;
  revoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  verificationUrl: string;
  metadataUri: string;
  certificateUri: string | null;
  qrCodeUri: string;
  issuer: {
    id: string;
    name: string;
    displayName: string | null;
    domain: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    status: string;
  };
}

export interface CredentialAssetBundle {
  metadata: CredentialMetadataDocument;
  metadataUri: string;
  qrCodeUri: string;
  certificateUri: string | null;
  verificationUrl: string;
  documentHash: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
}

type CredentialAssetPreviewBundle = Omit<
  CredentialAssetBundle,
  "documentHash" | "fileName" | "mimeType" | "fileSize"
>;

type AssetKind = "metadata" | "qr" | "certificate";

@Injectable()
export class CredentialAssetsService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly storage: StorageService,
  ) {}

  async generateAndPersist(record: CredentialAssetRecord): Promise<CredentialAssetBundle> {
    const previewBundle = this.buildBundle(record);
    const qrPayload = this.buildQrPayload(
      previewBundle.verificationUrl,
      record.signedVerificationToken,
    );
    const qrCodePng = await QRCode.toBuffer(
      qrPayload,
      {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#1f2937",
        light: "#ffffff",
      },
      },
    );
    const bundle: CredentialAssetBundle = {
      ...previewBundle,
      documentHash: record.documentHash,
      fileName: record.securePdfEnabled
        ? this.buildCertificateFileName(record.verificationId)
        : null,
      mimeType: record.securePdfEnabled ? "application/pdf" : null,
      fileSize: null,
    };

    const writes: Array<Promise<void>> = [
      this.storage.put(
        this.getAssetKey(record.id, "metadata"),
        JSON.stringify(bundle.metadata, null, 2),
        "application/json",
      ),
      this.storage.put(this.getAssetKey(record.id, "qr"), qrCodePng, "image/png"),
    ];

    if (record.securePdfEnabled && !record.documentHash) {
      const pdfBytes = await generateCredentialCertificatePdf({
        credentialId: record.id,
        verificationId: record.verificationId,
        studentName: record.studentName,
        studentId: record.studentId,
        degree: record.degree,
        issuedAt: record.issuedAt,
        revoked: record.revoked,
        revokedAt: record.revokedAt,
        issuer: record.issuer,
        verificationUrl: previewBundle.verificationUrl,
        qrCodePng,
      });
      const pdfBuffer = Buffer.from(pdfBytes);
      bundle.documentHash = hashBuffer(pdfBuffer);
      bundle.fileSize = pdfBuffer.byteLength;
      writes.push(
        this.storage.put(this.getAssetKey(record.id, "certificate"), pdfBuffer, "application/pdf"),
      );
    }

    await Promise.all(writes);

    return bundle;
  }

  async updateMetadata(record: CredentialAssetRecord) {
    const bundle = this.buildBundle(record);
    await this.storage.put(
      this.getAssetKey(record.id, "metadata"),
      JSON.stringify(bundle.metadata, null, 2),
      "application/json",
    );
    return bundle;
  }

  async readMetadata(credentialId: string) {
    return this.storage.getText(this.getAssetKey(credentialId, "metadata"));
  }

  async readQrCode(credentialId: string) {
    return this.storage.get(this.getAssetKey(credentialId, "qr"));
  }

  async readCertificate(credentialId: string) {
    return this.storage.get(this.getAssetKey(credentialId, "certificate"));
  }

  async deleteAssets(credentialId: string) {
    await this.storage.deletePrefix(this.getCredentialPrefix(credentialId));
  }

  async deleteQrCode(credentialId: string) {
    await this.storage.delete(this.getAssetKey(credentialId, "qr"));
  }

  buildBundle(record: CredentialAssetRecord): CredentialAssetPreviewBundle {
    const metadataUri = this.buildMetadataUri(record.id);
    const qrCodeUri = this.buildQrCodeUri(record.id);
    const certificateUri = record.securePdfEnabled
      ? this.buildCertificateUri(record.verificationId)
      : null;
    const verificationUrl = this.buildVerificationUrl(record.credentialExternalId);

    return {
      metadataUri,
      qrCodeUri,
      certificateUri,
      verificationUrl,
      metadata: {
        version: 1,
        credentialId: record.id,
        verificationId: record.verificationId,
        studentName: record.studentName,
        studentId: record.studentId,
        degree: record.degree,
        issuedAt: record.issuedAt.toISOString(),
        verificationCode: record.verificationCode,
        signedVerificationToken: record.signedVerificationToken,
        qrPayload: this.buildQrPayload(verificationUrl, record.signedVerificationToken),
        verificationMode: record.securePdfEnabled ? "SECURE_PDF" : "CORE_REGISTRY",
        securePdfEnabled: record.securePdfEnabled,
        documentHash: record.documentHash,
        revoked: record.revoked,
        revokedAt: record.revokedAt?.toISOString() ?? null,
        revocationReason: record.revocationReason,
        verificationUrl,
        metadataUri,
        certificateUri,
        qrCodeUri,
        issuer: {
          id: record.issuer.id,
          name: record.issuer.name,
          displayName: record.issuer.displayName,
          domain: record.issuer.domain,
          logoUrl: record.issuer.logoUrl,
          websiteUrl: record.issuer.websiteUrl,
          status: record.issuer.status,
        },
      },
    };
  }

  resolveMetadataUri(credentialId: string, value?: string | null) {
    const stored = this.normalizeNonEmpty(value);
    const expected = this.buildMetadataUri(credentialId);
    if (stored && stored === expected) {
      return stored;
    }
    return expected;
  }

  resolveQrCodeUri(credentialId: string, value?: string | null) {
    const stored = this.normalizeNonEmpty(value);
    const expected = this.buildQrCodeUri(credentialId);
    if (stored && stored === expected) {
      return stored;
    }
    return expected;
  }

  resolveCertificateUri(verificationId: string, value?: string | null) {
    const stored = this.normalizeNonEmpty(value);
    const expected = this.buildCertificateUri(verificationId);
    if (stored && stored === expected) {
      return stored;
    }
    return expected;
  }

  resolveVerificationUrl(credentialExternalId: string, value?: string | null) {
    const stored = this.normalizeNonEmpty(value);
    // Reject stored URLs that don't contain the crd_* identifier in the path.
    // Old records were generated with vrf_* or a token hash as the path segment.
    if (stored && stored.includes(`/verify/${credentialExternalId}`)) {
      return stored;
    }
    return this.buildVerificationUrl(credentialExternalId);
  }

  private buildMetadataUri(credentialId: string) {
    return `${this.getApiBaseUrl()}/credentials/${encodeURIComponent(credentialId)}/metadata`;
  }

  private buildQrCodeUri(credentialId: string) {
    return `${this.getApiBaseUrl()}/credentials/${encodeURIComponent(credentialId)}/qr`;
  }

  private buildCertificateUri(verificationId: string) {
    return `${this.getApiBaseUrl()}/verify/${encodeURIComponent(verificationId)}/certificate`;
  }

  private buildVerificationUrl(credentialExternalId: string) {
    return `${this.getWebBaseUrl()}/verify/${encodeURIComponent(credentialExternalId)}`;
  }

  private buildQrPayload(verificationUrl: string, signedVerificationToken: string) {
    const url = new URL(verificationUrl);
    url.searchParams.set("token", signedVerificationToken);
    return url.toString();
  }

  private buildCertificateFileName(verificationId: string) {
    return `credential-${verificationId}.pdf`;
  }

  private getApiBaseUrl() {
    return this.configService.apiPublicBaseUrl.replace(/\/+$/, "");
  }

  private getWebBaseUrl() {
    return this.configService.webPublicBaseUrl.replace(/\/+$/, "");
  }

  /**
   * Object storage key prefix for all assets belonging to one credential.
   * For local storage this resolves to a subdirectory under assetStorageRoot.
   * For R2 this is the S3 key prefix.
   */
  private getCredentialPrefix(credentialId: string) {
    return `credentials/${credentialId}`;
  }

  private getAssetKey(credentialId: string, kind: AssetKind) {
    const prefix = this.getCredentialPrefix(credentialId);
    if (kind === "metadata") return `${prefix}/metadata.json`;
    if (kind === "qr") return `${prefix}/verification-qr.png`;
    return `${prefix}/certificate.pdf`;
  }

  // ── Legacy helpers kept for backward compatibility (local path resolution) ──

  /** @internal Used only by migration tooling */
  getLocalAssetPath(credentialId: string, kind: AssetKind): string {
    const configured = this.configService.assetStorageRoot;
    const root = isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
    return join(root, this.getAssetKey(credentialId, kind));
  }

  private normalizeNonEmpty(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
