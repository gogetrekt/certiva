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

export default async function IssueCredentialPage() {
  const token = await getSessionToken();
  if (!token) return null;

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
        <p className="kicker mb-2">Issue</p>
        <h1 className="page-title">Issue Credential</h1>
        <p className="body-text mt-2">
          Single issue for individual credentials. Bulk issue for CSV-based
          batch runs.
        </p>
      </div>

      {/* â”€â”€ Two-column form layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Single issue */}
        <div className="work-surface overflow-hidden p-0">
          <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
            <p className="kicker mb-1">Single issue</p>
            <h2 className="section-title">Create one credential</h2>
          </div>
          <div className="px-6 py-6">
            <IssueCredentialForm institutionName={institutionLabel} />
          </div>
        </div>

        {/* Bulk issue */}
        <div className="space-y-4">
          <div className="work-surface overflow-hidden p-0">
            <div className="px-6 py-5 border-b border-[hsl(var(--border-default))]">
              <p className="kicker mb-1">Bulk issue</p>
              <h2 className="section-title">Preview and issue from CSV</h2>
            </div>
            <div className="px-6 py-6">
              <BulkIssueCredentials institutionName={institutionLabel} />
            </div>
          </div>

          <DisclosurePanel summary="Workflow boundaries">
            <div className="space-y-2 pt-1">
              {[
                "Credential verification supports direct code lookup and PDF QR lookup.",
                "Secure document proof is a separate post-issuance hash registration flow.",
                ...(admin.role === "SUPER_ADMIN"
                  ? [
                      "Revocation and delete actions are protected for higher privilege operators.",
                    ]
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

