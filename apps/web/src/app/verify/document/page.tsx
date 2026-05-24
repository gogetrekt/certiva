import Link from "next/link";
import type { Metadata } from "next";

import { DocumentProofCodeForm } from "../../../components/document-proof-code-form";
import { SiteHeader } from "../../../components/site-header";
import { VerifyUploadPanel } from "../../../components/verify-upload-panel";

export const metadata: Metadata = {
  title: "Document Check",
};

export default function VerifyDocumentPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      <SiteHeader />

      {/* ── Content ────────────────────────────────────── */}
      <div className="mx-auto max-w-275 px-8">

        {/* Page intent */}
        <div className="pt-12 pb-10 border-b border-[hsl(var(--border-default))]">
          <p className="kicker mb-3">Document integrity check</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] text-[hsl(var(--text-primary))] md:text-[2.5rem]">
            Check whether the PDF seal still matches.
          </h1>
          <p className="mt-3 max-w-120 text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            Upload a PDF to compare its SHA-256 hash against the registered proof record. Checks document integrity only — not credential validity.
          </p>
        </div>

        {/* Primary workflow — upload */}
        <div className="py-10 border-b border-[hsl(var(--border-default))]">
          <div className="grid gap-10 md:grid-cols-[1fr_340px]">

            {/* Upload area */}
            <div>
              <p className="kicker mb-2">Primary method</p>
              <h2 className="text-[1.1875rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-6">
                Upload a PDF to verify
              </h2>
              <VerifyUploadPanel />
            </div>

            {/* Secondary + scope sidebar */}
            <div className="space-y-5 self-start">
              <div className="work-surface overflow-hidden p-0">
                <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
                  <p className="kicker mb-1">Metadata lookup</p>
                  <h3 className="section-title mb-1">Look up by Document Proof ID</h3>
                  <p className="meta-text">
                    Retrieves proof record metadata only. Does not verify the document file or prove integrity.
                  </p>
                </div>
                <div className="px-5 py-5">
                  <DocumentProofCodeForm compact />
                </div>
              </div>

              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-5 py-4">
                <p className="kicker mb-3">What this checks</p>
                <div className="space-y-2.5">
                  {[
                    "Compares the uploaded PDF's SHA-256 hash to the registered proof.",
                    "Does not resolve registry identity or academic status.",
                    "Only checks file bytes against the registered hash.",
                  ].map((note) => (
                    <div key={note} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]" aria-hidden />
                      <p className="text-xs leading-[1.6] text-[hsl(var(--text-tertiary))]">{note}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[hsl(var(--border-subtle))]">
                  <p className="text-xs leading-[1.6] text-[hsl(var(--text-quaternary))]">
                    To verify credential validity, use{" "}
                    <Link
                      href="/verify"
                      className="text-[hsl(var(--text-secondary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
                    >
                      Credential Check
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer margin */}
        <div className="py-10" />
      </div>
    </div>
  );
}
