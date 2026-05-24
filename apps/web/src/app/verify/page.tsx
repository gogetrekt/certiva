import Link from "next/link";

import { SiteHeader } from "../../components/site-header";
import { VerifyPdfReferenceForm } from "../../components/verify-pdf-reference-form";
import { VerifySearchForm } from "../../components/verify-search-form";

export default function VerifyPage() {
  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      <SiteHeader />

      {/* ── Primary workflow ─────────────────────────── */}
      <div className="mx-auto max-w-275 px-8">

        {/* Page intent */}
        <div className="pt-12 pb-10 border-b border-[hsl(var(--border-default))]">
          <p className="kicker mb-3">Credential verification</p>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] leading-[1.08] text-[hsl(var(--text-primary))] md:text-[2.5rem]">
            Verify an issued credential.
          </h1>
          <p className="mt-3 max-w-120 text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            Confirm authenticity against the institutional registry. Returns verdict, credential facts, issuer status, and blockchain proof state.
          </p>
        </div>

        {/* Primary method */}
        <div className="py-10 border-b border-[hsl(var(--border-default))]">
          <div className="grid gap-10 md:grid-cols-[1fr_400px]">

            {/* Context */}
            <div>
              <p className="kicker mb-2">Primary method</p>
              <h2 className="text-[1.1875rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-2.5">
                Look up by verification ID
              </h2>
              <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))] max-w-[360px]">
                Enter the verification ID exactly as shown on the credential or in the institution&apos;s email. The lookup is real-time against the registry.
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  { label: "Verdict", desc: "Valid, revoked, tampered, or not found." },
                  { label: "Credential facts", desc: "Student, degree, and issue date." },
                  { label: "Issuer", desc: "Institution identity and status." },
                  { label: "Blockchain proof", desc: "Secondary audit layer on Polygon." },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--border-strong))]" aria-hidden />
                    <p className="text-xs leading-[1.6] text-[hsl(var(--text-tertiary))]">
                      <span className="font-semibold text-[hsl(var(--text-secondary))]">{item.label}.</span>{" "}
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="work-surface p-6 self-start">
              <VerifySearchForm />
            </div>
          </div>
        </div>

        {/* Secondary method */}
        <div className="py-10 border-b border-[hsl(var(--border-default))]">
          <div className="grid gap-10 md:grid-cols-[1fr_400px]">

            {/* Context */}
            <div>
              <p className="kicker mb-2">Secondary method</p>
              <h2 className="text-[1.1875rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-2.5">
                Scan a credential PDF
              </h2>
              <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))] max-w-[360px]">
                Upload the official PDF. Certiva reads the embedded QR code or reference and resolves the registry record automatically.
              </p>
              <p className="mt-4 text-xs leading-[1.6] text-[hsl(var(--text-quaternary))]">
                This method resolves the registry reference only. To check whether the PDF file itself has been modified, use{" "}
                <Link
                  href="/verify/document"
                  className="text-[hsl(var(--text-secondary))] underline underline-offset-2 hover:text-[hsl(var(--text-primary))] transition-colors"
                >
                  Document Check
                </Link>{" "}
                instead.
              </p>
            </div>

            {/* Form */}
            <div className="work-surface p-6 self-start">
              <VerifyPdfReferenceForm />
            </div>
          </div>
        </div>

        {/* Footer margin */}
        <div className="py-10" />
      </div>
    </div>
  );
}
