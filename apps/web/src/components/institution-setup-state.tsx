"use client";

import Link from "next/link";

import { EmptyState } from "./empty-state";
import { useLanguage } from "../lib/i18n";

export function InstitutionSetupState({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { t } = useLanguage();
  const description = isSuperAdmin
    ? t.forms.institutionSetup.superAdminDescription
    : t.forms.institutionSetup.adminDescription;

  return (
    <EmptyState
      title={t.forms.institutionSetup.title}
      description={description}
      action={
        isSuperAdmin ? (
          <Link href="/dashboard/settings" className="btn-primary btn-sm">
            {t.forms.institutionSetup.action}
          </Link>
        ) : null
      }
    />
  );
}
