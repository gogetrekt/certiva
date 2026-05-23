import { redirect } from "next/navigation";

import { InstitutionSettingsForm } from "../../../components/institution-settings-form";
import { InstitutionSetupState } from "../../../components/institution-setup-state";
import type { InstitutionRecord } from "../../../lib/api";
import {
  getCurrentAdmin,
  getInstitution,
  getSessionToken,
  isInstitutionSetupRequired,
} from "../../../lib/api";

export default async function SettingsPage() {
  const token = await getSessionToken();
  if (!token) return null;

  const admin = await getCurrentAdmin(token);
  if (admin.role !== "OWNER" && admin.role !== "SUPER_ADMIN") redirect("/dashboard");

  let institution: InstitutionRecord;
  try {
    institution = await getInstitution(token);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return <InstitutionSetupState isSuperAdmin={true} />;
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────── */}
      <div className="pb-5 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-1.5">Settings</p>
        <h1 className="page-title">Settings</h1>
        <p className="body-text mt-1.5">
          Manage the institutional identity used across credential issuance,
          verification, and branding.
        </p>
      </div>

      {/* ── Split layout ─────────────────────────────── */}
      <div className="grid gap-8 xl:grid-cols-[1fr_240px]">
        {/* Settings form */}
        <InstitutionSettingsForm institution={institution} />

        {/* Side notes */}
        <div className="space-y-5">
          <div>
            <p className="kicker mb-3">Scope</p>
            <div className="space-y-3">
              {[
                "Branding shown on verification pages and certificates.",
                "Institution domain and verification presentation settings.",
                "Issuer wallet address used for blockchain proof anchoring and revocation.",
              ].map((text) => (
                <p
                  key={text}
                  className="text-xs leading-5 text-[hsl(var(--text-tertiary))]"
                >
                  {text}
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-[hsl(var(--border-subtle))] pt-4">
            <p className="kicker mb-2">Access</p>
            <p className="text-xs leading-5 text-[hsl(var(--text-tertiary))]">
              Super admin only. Changes take effect immediately on save.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
