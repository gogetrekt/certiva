import { BulkIssueCredentials } from "../../../components/bulk-issue-credentials";
import { DisclosurePanel } from "../../../components/disclosure-panel";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import { IssueCredentialForm } from "../../../components/issue-credential-form";
import type { InstitutionRecord } from "../../../lib/api";
import {
  getCurrentAdmin,
  getInstitution,
  getSessionToken,
  isInstitutionSetupRequired,
} from "../../../lib/api";
import { getServerDictionary } from "../../../lib/i18n-server";

export default async function IssueCredentialPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

  const admin = await getCurrentAdmin(token);
  let institution: InstitutionRecord;

  try {
    institution = await getInstitution(token);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return (
        <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />
      );
    }
    throw error;
  }

  const institutionLabel = institution.displayName ?? institution.name;

  return (
    <div className="space-y-6">
      {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-2">{t.dashboard.issue.kicker}</p>
        <h1 className="page-title">{t.dashboard.issue.title}</h1>
        <p className="body-text mt-2">
          {t.dashboard.issue.description}
        </p>
      </div>

      {/* â”€â”€ Two-column form layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Single issue */}
        <div className="work-surface overflow-hidden p-0">
          <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
            <p className="kicker mb-1">{t.dashboard.issue.singleIssue}</p>
            <h2 className="section-title">{t.dashboard.issue.createOne}</h2>
          </div>
          <div className="px-6 py-6">
            <IssueCredentialForm institutionName={institutionLabel} />
          </div>
        </div>

        {/* Bulk issue */}
        <div className="space-y-4">
          <div className="work-surface overflow-hidden p-0">
            <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
              <p className="kicker mb-1">{t.dashboard.issue.bulkIssue}</p>
              <h2 className="section-title">{t.dashboard.issue.previewCsv}</h2>
            </div>
            <div className="px-6 py-6">
              <BulkIssueCredentials institutionName={institutionLabel} />
            </div>
          </div>

          <DisclosurePanel summary={t.dashboard.issue.workflowBoundaries}>
            <div className="space-y-2 pt-1">
              {[
                t.dashboard.issue.boundaries[0],
                t.dashboard.issue.boundaries[1],
                ...(admin.role === "SUPER_ADMIN"
                  ? [t.dashboard.issue.boundaries[2]]
                  : []),
              ].map((text) => (
                <p
                  key={text}
                  className="text-xs text-[hsl(var(--text-tertiary))] py-2 border-b border-[hsl(var(--border-subtle))] last:border-0"
                >
                  {text}
                </p>
              ))}
            </div>
          </DisclosurePanel>
        </div>
      </div>
    </div>
  );
}

