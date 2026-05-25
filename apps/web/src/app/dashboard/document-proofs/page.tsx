import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";

import { CreateDocumentProofForm } from "../../../components/create-document-proof-form";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import {
  getCurrentAdmin,
  getDocumentProofs,
  getSessionToken,
  isInstitutionSetupRequired,
  type DocumentProofRecord,
} from "../../../lib/api";
import { getServerDictionary } from "../../../lib/i18n-server";
import { DocumentProofsList } from "./document-proofs-list";

export default async function DocumentProofPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const admin = await getCurrentAdmin(token);
  const isSuperAdmin = admin.role === "OWNER" || admin.role === "SUPER_ADMIN";
  let proofs: { total: number; items: DocumentProofRecord[] };

  try {
    proofs = await getDocumentProofs(token);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return <InstitutionSetupState isSuperAdmin={isSuperAdmin} />;
    }
    throw error;
  }

  const hashOnlyCount = proofs.items.filter(
    (item) => item.anchorStatus === "HASH_ONLY",
  ).length;
  const totalChecks = proofs.items.reduce(
    (sum, item) => sum + item.verificationCount,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker mb-1.5">{t.dashboard.documentProofs.title}</p>
            <h1 className="page-title">{t.dashboard.documentProofs.title}</h1>
            <p className="body-text mt-1.5 max-w-lg">
              {t.dashboard.documentProofs.subtitle}
            </p>
          </div>
          <Link
            href="/verify/document"
            target="_blank"
            className="btn-ghost btn-sm mt-1 shrink-0"
          >
            {t.dashboard.documentProofs.publicCheck}
            <ArrowSquareOut size={11} aria-hidden />
          </Link>
        </div>
      </div>

      {/* Primary workflow: registration */}
      <div className="grid gap-6 xl:grid-cols-[480px_1fr]">
        {/* Left: registration form hidden for AUDITOR */}
        {admin.role !== "AUDITOR" && (
          <div className="space-y-4">
            <div className="work-surface overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
                <h2 className="section-title">{t.dashboard.documentProofs.registerHash}</h2>
                <p className="meta-text mt-0.5">
                  {t.dashboard.documentProofs.registerDescription}
                </p>
              </div>
              <div className="px-5 py-5">
                <CreateDocumentProofForm />
              </div>
            </div>

            {/* Workflow notes */}
            <div className="space-y-1 px-1">
              {[
                { n: "01", text: t.dashboard.documentProofs.workflow[0] },
                { n: "02", text: t.dashboard.documentProofs.workflow[1] },
                { n: "03", text: t.dashboard.documentProofs.workflow[2] },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3 py-2">
                  <span className="mt-0.5 shrink-0 font-mono text-[0.625rem] font-semibold text-[hsl(var(--text-quaternary))] w-5">
                    {n}
                  </span>
                  <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right: proof records */}
        <div className={admin.role === "AUDITOR" ? "xl:col-span-2" : ""}>
          {/* Compact stats strip */}
          <div className="flex items-center gap-6 mb-4">
            <div>
              <span className="text-xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {proofs.total}
              </span>
              <span className="ml-1.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.dashboard.documentProofs.proofRecords}
              </span>
            </div>
            <div className="w-px h-4 bg-[hsl(var(--border-default))]" />
            <div>
              <span className="text-xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {hashOnlyCount}
              </span>
              <span className="ml-1.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.dashboard.documentProofs.hashOnly}
              </span>
            </div>
            <div className="w-px h-4 bg-[hsl(var(--border-default))]" />
            <div>
              <span className="text-xl font-semibold tracking-tight text-[hsl(var(--text-primary))]">
                {totalChecks}
              </span>
              <span className="ml-1.5 text-xs text-[hsl(var(--text-tertiary))]">
                {t.dashboard.documentProofs.publicChecks}
              </span>
            </div>
          </div>

          {/* Records list (client component for bulk selection) */}
          <DocumentProofsList proofs={proofs} role={admin.role} />
        </div>
      </div>
    </div>
  );
}
