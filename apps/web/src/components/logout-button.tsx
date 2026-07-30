"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { useLanguage } from "../lib/i18n";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await fetch("/api/session/logout", { method: "POST" });
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="btn-ghost btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? t.forms.logout.signingOut : t.forms.logout.signOut}
    </button>
  );
}
