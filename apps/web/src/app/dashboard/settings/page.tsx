import type { Metadata } from "next";
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
import { getServerDictionary } from "../../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return { title: t.metadata.settingsTitle };
}

export default async function SettingsPage() {
  const token = await getSessionToken();
  if (!token) return null;
  const t = await getServerDictionary();

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
    <div className="space-y-5">
      <div className="pb-4 border-b border-[hsl(var(--border-default))]">
        <p className="kicker mb-1.5">{t.dashboard.settings.title}</p>
        <h1 className="page-title">{t.dashboard.settings.title}</h1>
        <p className="body-text mt-1.5">{t.dashboard.settings.description}</p>
      </div>

      <InstitutionSettingsForm institution={institution} />
    </div>
  );
}
