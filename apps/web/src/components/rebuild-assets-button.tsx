"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "../lib/i18n";

export function RebuildAssetsButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleRebuild() {
    setIsSubmitting(true);
    setError(null);
    setDone(false);
    try {
      const response = await fetch(`/api/credentials/${credentialId}/rebuild-assets`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? t.forms.rebuildAssets.unable);
      }
      setDone(true);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forms.rebuildAssets.unable);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleRebuild}
        disabled={isSubmitting}
        className="btn-ghost btn-sm"
      >
        {isSubmitting
          ? t.forms.rebuildAssets.rebuilding
          : done
            ? t.forms.rebuildAssets.rebuilt
            : t.forms.rebuildAssets.submit}
      </button>
      {error ? (
        <p className="text-xs text-[hsl(var(--status-error-text))]">{error}</p>
      ) : null}
    </div>
  );
}
