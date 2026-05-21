import Link from "next/link";

import { EmptyState } from "./empty-state";

export function InstitutionSetupState({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const description = isSuperAdmin
    ? "This workspace needs an active institution profile before credentials, logs, and issuance can load. Configure institution settings to continue."
    : "This workspace needs an active institution profile before credentials, logs, and issuance can load. Ask a super admin to complete setup.";

  return (
    <EmptyState
      title="Institution setup required"
      description={description}
      action={
        isSuperAdmin ? (
          <Link href="/dashboard/settings" className="btn-primary btn-sm">
            Open institution settings
          </Link>
        ) : null
      }
    />
  );
}
