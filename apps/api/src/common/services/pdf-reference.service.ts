import { BadRequestException, Injectable } from "@nestjs/common";
import { createCanvas } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC_HEADER = Buffer.from("%PDF-");
const ACCEPTED_PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
]);

interface UploadedPdfFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

type ReferenceKind = "credential" | "document";

@Injectable()
export class PdfReferenceService {
  async prepareUploadedPdf(file?: UploadedPdfFile) {
    this.assertValidPdfUpload(file);
    const validFile = file as UploadedPdfFile;
    await this.assertReadablePdf(validFile.buffer);
    return validFile;
  }

  async extractReferenceFromPdfBuffer(
    buffer: Buffer,
    expectedKind?: ReferenceKind,
  ) {
    const inlineReference = this.extractReferenceFromText(buffer, expectedKind);
    if (inlineReference) {
      return inlineReference;
    }

    const extractedTextReference = await this.extractReferenceFromPdfText(
      buffer,
      expectedKind,
    );
    if (extractedTextReference) {
      return extractedTextReference;
    }

    const imageReference = await this.extractReferenceFromPdfImages(
      buffer,
      expectedKind,
    );
    if (imageReference) {
      return imageReference;
    }

    try {
      const renderedReference = await this.extractReferenceFromRenderedQr(
        buffer,
        expectedKind,
      );
      return renderedReference;
    } catch {
      return null;
    }
  }

  assertValidPdfUpload(file?: UploadedPdfFile) {
    if (!file) {
      throw new BadRequestException("A PDF file is required.");
    }

    if (!Buffer.isBuffer(file.buffer) || file.buffer.byteLength === 0) {
      throw new BadRequestException("Uploaded PDF content is empty.");
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException("PDF uploads must be 10MB or smaller.");
    }

    const normalizedMimeType = file.mimetype.trim().toLowerCase();
    if (!ACCEPTED_PDF_MIME_TYPES.has(normalizedMimeType)) {
      throw new BadRequestException("Only PDF uploads are accepted.");
    }

    if (
      !file.buffer.subarray(0, PDF_MAGIC_HEADER.length).equals(PDF_MAGIC_HEADER)
    ) {
      throw new BadRequestException("Malformed PDF header.");
    }
  }

  async assertReadablePdf(buffer: Buffer) {
    try {
      await PDFDocument.load(buffer);
    } catch {
      throw new BadRequestException("Malformed PDF document.");
    }
  }

  private extractReferenceFromText(
    buffer: Buffer,
    expectedKind?: ReferenceKind,
  ) {
    return this.extractReferenceFromString(
      buffer.toString("latin1").replace(/\\([()\\])/g, "$1"),
      expectedKind,
    );
  }

  private async extractReferenceFromPdfText(
    buffer: Buffer,
    expectedKind?: ReferenceKind,
  ) {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        disableFontFace: true,
      });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 3);

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const text = await page.getTextContent();
        const content = text.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ");
        const reference = this.extractReferenceFromString(
          content,
          expectedKind,
        );
        if (reference) {
          return reference;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private extractReferenceFromString(
    value: string,
    expectedKind?: ReferenceKind,
  ) {
    const decoded = value;

    const candidates = [
      decoded.match(/\/proof\/([A-Za-z0-9_-]+)/)?.[1] ?? null,
      decoded.match(/\/verify\/([A-Za-z0-9_-]+)/)?.[1] ?? null,
      decoded.match(/\bdpf_[a-f0-9]{12,}\b/i)?.[0] ?? null,
      decoded.match(/\bvrf_[a-f0-9]{12,}\b/i)?.[0] ?? null,
      decoded.match(/\bDP-[A-F0-9]{8,}\b/i)?.[0]?.toUpperCase() ?? null,
      decoded.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase() ?? null,
    ].filter((value): value is string => Boolean(value));

    return candidates.find((candidate) =>
      this.matchesExpectedKind(candidate, expectedKind),
    );
  }

  private async extractReferenceFromPdfImages(
    buffer: Buffer,
    expectedKind?: ReferenceKind,
  ) {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        disableFontFace: true,
      });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 3);
      const imageOps = new Set([
        pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintInlineImageXObject,
        pdfjs.OPS.paintImageMaskXObject,
      ]);

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const operatorList = await page.getOperatorList();

        for (let index = 0; index < operatorList.fnArray.length; index += 1) {
          if (!imageOps.has(operatorList.fnArray[index])) {
            continue;
          }

          const [imageId] = operatorList.argsArray[index] ?? [];
          if (typeof imageId !== "string") {
            continue;
          }

          const image = await new Promise<{
            width: number;
            height: number;
            data: Uint8Array;
          } | null>((resolve) => {
            try {
              page.objs.get(imageId, (value) => {
                if (
                  value &&
                  typeof value.width === "number" &&
                  typeof value.height === "number" &&
                  value.data
                ) {
                  resolve(value as { width: number; height: number; data: Uint8Array });
                  return;
                }

                resolve(null);
              });
            } catch {
              resolve(null);
            }
          });

          if (!image) {
            continue;
          }

          const payload = this.decodeQrPayload(
            this.normalizeImageData(image),
            image.width,
            image.height,
          );
          if (!payload) {
            continue;
          }

          const reference = this.extractReferenceFromPayload(
            payload,
            expectedKind,
          );
          if (reference) {
            return reference;
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private async extractReferenceFromRenderedQr(
    buffer: Buffer,
    expectedKind?: ReferenceKind,
  ) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      disableFontFace: true,
    });
    const pdf = await loadingTask.promise;
    const maxPages = Math.min(pdf.numPages, 2);

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      for (const scale of [2, 3, 4]) {
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(
          Math.max(1, Math.ceil(viewport.width)),
          Math.max(1, Math.ceil(viewport.height)),
        );
        const context = canvas.getContext("2d");
        await page.render({
          canvas: canvas as never,
          canvasContext: context as never,
          viewport,
        }).promise;

        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const payload = this.decodeQrPayload(
          imageData.data,
          canvas.width,
          canvas.height,
        );
        if (!payload) {
          continue;
        }

        const reference = this.extractReferenceFromPayload(
          payload,
          expectedKind,
        );
        if (reference) {
          return reference;
        }
      }
    }

    return null;
  }

  private decodeQrPayload(
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ) {
    try {
      const result = jsQR(data, width, height, {
        inversionAttempts: "attemptBoth",
      });
      return result?.data ?? null;
    } catch {
      return null;
    }
  }

  private normalizeImageData(image: {
    width: number;
    height: number;
    data: Uint8Array;
  }) {
    if (image.data.length === image.width * image.height * 4) {
      return Uint8ClampedArray.from(image.data);
    }

    if (image.data.length === image.width * image.height * 3) {
      const rgba = new Uint8ClampedArray(image.width * image.height * 4);
      for (
        let sourceIndex = 0, targetIndex = 0;
        sourceIndex < image.data.length;
        sourceIndex += 3, targetIndex += 4
      ) {
        rgba[targetIndex] = image.data[sourceIndex] ?? 0;
        rgba[targetIndex + 1] = image.data[sourceIndex + 1] ?? 0;
        rgba[targetIndex + 2] = image.data[sourceIndex + 2] ?? 0;
        rgba[targetIndex + 3] = 255;
      }
      return rgba;
    }

    return Uint8ClampedArray.from(image.data);
  }

  private extractReferenceFromPayload(
    payload: string,
    expectedKind?: ReferenceKind,
  ) {
    const trimmed = payload.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const url = new URL(trimmed);
      const pathMatch =
        url.pathname.match(/\/proof\/([A-Za-z0-9_-]+)/) ??
        url.pathname.match(/\/verify\/([A-Za-z0-9_-]+)/);
      const pathReference = pathMatch?.[1] ?? null;
      if (pathReference && this.matchesExpectedKind(pathReference, expectedKind)) {
        return pathReference;
      }

      const token = url.searchParams.get("token");
      if (token && this.matchesExpectedKind(token, expectedKind)) {
        return token;
      }
    } catch {
      // fall through to raw-pattern parsing
    }

    const inlineMatch =
      trimmed.match(/\bdpf_[a-f0-9]{12,}\b/i)?.[0] ??
      trimmed.match(/\bvrf_[a-f0-9]{12,}\b/i)?.[0] ??
      trimmed.match(/\bDP-[A-F0-9]{8,}\b/i)?.[0]?.toUpperCase() ??
      trimmed.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase() ??
      null;

    if (inlineMatch && this.matchesExpectedKind(inlineMatch, expectedKind)) {
      return inlineMatch;
    }

    return null;
  }

  private matchesExpectedKind(
    reference: string,
    expectedKind?: ReferenceKind,
  ) {
    if (!expectedKind) {
      return true;
    }

    if (expectedKind === "document") {
      return (
        reference.startsWith("dpf_") ||
        reference.startsWith("DP-") ||
        /^[a-f0-9]{64}$/i.test(reference)
      );
    }

    return (
      reference.startsWith("vrf_") ||
      /^[a-f0-9]{64}$/i.test(reference)
    );
  }
}
