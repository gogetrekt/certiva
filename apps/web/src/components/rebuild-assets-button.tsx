"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function RebuildAssetsButton({ credentialId }: { credentialId: string }) {
  const router = useRouter();
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
        throw new Error(body.message ?? "Unable to rebuild assets");
      }
      setDone(true);
      startTransition(() => { router.refresh(); });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rebuild assets");
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
        {isSubmitting ? "Rebuilding…" : done ? "Rebuilt ✓" : "Rebuild QR & assets"}
      </button>
      {error ? (
        <p className="text-xs text-[hsl(var(--status-error-text))]">{error}</p>
      ) : null}
    </div>
  );
}
