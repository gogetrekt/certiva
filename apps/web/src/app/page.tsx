import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  FileText,
  IdentificationCard,
  ShieldCheck,
  Cube,
  Fingerprint,
  Buildings,
} from "@phosphor-icons/react/dist/ssr";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getSessionToken } from "../lib/api";

export default async function HomePage() {
  const token = await getSessionToken();
  if (token) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">

      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--border-default))]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-0 px-8 md:grid-cols-[1fr_420px]">

          {/* Left -- content column */}
          <div className="flex flex-col justify-center py-20 md:py-28 md:pr-16">
            <p className="kicker mb-5">Academic credential infrastructure</p>
            <h1 className="text-[2.75rem] font-semibold tracking-[-0.04em] leading-[1.05] text-[hsl(var(--text-primary))] md:text-[3.5rem]">
              Institutional-grade<br />credential verification.
            </h1>
            <p className="mt-6 text-[0.9375rem] leading-[1.7] text-[hsl(var(--text-secondary))] max-w-[440px]">
              Issue, anchor, and verify academic credentials with full blockchain audit trails. Built for institutions that need traceable, tamper-evident records.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/verify" className="btn-primary">
                Verify a credential
                <ArrowRight size={13} weight="bold" aria-hidden />
              </Link>
              <Link href="/login" className="btn-ghost">
                Institution sign in
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {[
                "Blockchain-anchored",
                "SHA-256 integrity",
                "Polygon Amoy",
                "Public verification",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[hsl(var(--status-valid-dot))]" aria-hidden />
                  <span className="text-[0.6875rem] tracking-wide uppercase font-medium text-[hsl(var(--text-quaternary))]">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right -- structural visual */}
          <div className="hidden md:flex items-center justify-center border-l border-[hsl(var(--border-default))] py-28 px-10">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── Capabilities ───────────────────────────────── */}
      <section className="border-b border-[hsl(var(--border-default))]">
        <div className="mx-auto max-w-[1200px] px-8 py-16 md:py-20">
          <div className="grid gap-px bg-[hsl(var(--border-default))] rounded-xl overflow-hidden border border-[hsl(var(--border-default))] md:grid-cols-3">
            {[
              {
                icon: <Fingerprint size={16} weight="duotone" aria-hidden />,
                kicker: "Cryptographic identity",
                title: "Registry-backed records",
                body: "Every credential is stored against the institutional registry with issuer signatures and an immutable issue timestamp.",
              },
              {
                icon: <Cube size={16} weight="duotone" aria-hidden />,
                kicker: "Blockchain audit trail",
                title: "Polygon Amoy anchoring",
                body: "Credential hashes are anchored on-chain. Any relying party can independently verify proof existence without calling the API.",
              },
              {
                icon: <FileText size={16} weight="duotone" aria-hidden />,
                kicker: "Document integrity",
                title: "SHA-256 tamper detection",
                body: "PDF documents are proofed at upload time. A single byte change surfaces immediately on re-check.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-[hsl(var(--bg-base))] px-7 py-8">
                <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))]">
                  {item.icon}
                </div>
                <p className="kicker mb-2">{item.kicker}</p>
                <h3 className="text-[0.9375rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Entry points ───────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-8 py-16 md:py-20">
        <div className="mb-10 max-w-[520px]">
          <p className="kicker mb-3">Where do you want to go?</p>
          <h2 className="text-[1.625rem] font-semibold tracking-[-0.03em] leading-[1.2] text-[hsl(var(--text-primary))]">
            Three distinct entry points.
          </h2>
          <p className="mt-2.5 text-sm leading-[1.7] text-[hsl(var(--text-secondary))]">
            Public checks are separated so relying parties do not conflate credential validity with file integrity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <EntryCard
            href="/verify"
            icon={<ShieldCheck size={16} weight="duotone" aria-hidden />}
            kicker="Registry lookup"
            title="Credential Check"
            body="Confirm a credential is official and still active. Returns verdict, credential facts, issuer identity, and blockchain proof state."
            cta="Verify credential"
          />
          <EntryCard
            href="/verify/document"
            icon={<FileText size={16} weight="duotone" aria-hidden />}
            kicker="Hash integrity"
            title="Document Check"
            body="Upload the credential PDF. Compare its SHA-256 hash against the registered proof record. File-level tamper detection."
            cta="Check document"
          />
          <EntryCard
            href="/login"
            icon={<Buildings size={16} weight="duotone" aria-hidden />}
            kicker="Institution workspace"
            title="Sign In"
            body="Issue credentials, manage the registry, review verification activity, and maintain proof operations."
            cta="Open workspace"
          />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function EntryCard({
  href,
  icon,
  kicker,
  title,
  body,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-[hsl(var(--bg-base))] border border-[hsl(var(--border-default))] rounded-xl p-6 transition-all duration-200 hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-subtle))] hover:shadow-[0_4px_24px_-8px_hsl(var(--z-950)/0.06)]"
    >
      {/* Left accent rail */}
      <span
        className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full bg-[hsl(var(--border-default))] transition-all duration-300 group-hover:bg-[hsl(var(--text-tertiary))] group-hover:top-4 group-hover:bottom-4"
        aria-hidden
      />

      <div className="mb-5 ml-3 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-tertiary))] transition-colors group-hover:border-[hsl(var(--border-strong))] group-hover:text-[hsl(var(--text-primary))]">
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <p className="kicker mb-1.5">{kicker}</p>
        <h3 className="text-[0.9375rem] font-semibold tracking-tight text-[hsl(var(--text-primary))] mb-2.5">
          {title}
        </h3>
        <p className="text-sm leading-[1.65] text-[hsl(var(--text-secondary))]">{body}</p>
      </div>
      <div className="ml-3 mt-6 flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--text-tertiary))] transition-colors group-hover:text-[hsl(var(--text-primary))]">
        {cta}
        <ArrowRight
          size={11}
          weight="bold"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function HeroVisual() {
  return (
    <div className="w-full max-w-[320px] space-y-3 select-none" aria-hidden>
      {/* Simulated credential record */}
      <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] overflow-hidden">
        <div className="px-4 py-3 border-b border-[hsl(var(--border-default))] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--status-valid-dot))]" />
            <span className="text-[0.6875rem] font-semibold tracking-widest uppercase text-[hsl(var(--text-tertiary))]">Valid</span>
          </div>
          <span className="text-[0.625rem] font-mono text-[hsl(var(--text-quaternary))]">vrf_2f9a0cdbe7c1</span>
        </div>
        <div className="px-4 py-4 space-y-3">
          {[
            { label: "Recipient", value: "Ahmad Fauzi Ramadhan" },
            { label: "Degree", value: "S.Kom., Ilmu Komputer" },
            { label: "Institution", value: "Universitas Gadjah Mada" },
            { label: "Issued", value: "14 March 2024" },
          ].map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5">
              <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-[hsl(var(--text-quaternary))]">{row.label}</span>
              <span className="text-[0.8125rem] font-medium text-[hsl(var(--text-primary))]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Blockchain proof strip */}
      <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.6875rem] font-semibold tracking-widest uppercase text-[hsl(var(--text-tertiary))]">Blockchain proof</span>
          <span className="badge badge-valid">Anchored</span>
        </div>
        <p className="hash-text text-[hsl(var(--text-quaternary))] leading-5">
          0x3a7f2e…c4d1b8
        </p>
        <p className="mt-1 text-[0.625rem] text-[hsl(var(--text-quaternary))]">Polygon Amoy · Block 14,203,847</p>
      </div>
    </div>
  );
}
