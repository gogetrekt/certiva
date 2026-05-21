"use client";

import { useState } from "react";
import { DownloadSimple, Spinner } from "@phosphor-icons/react";

export function ExportButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/audit/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certiva-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Export error — user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn-ghost btn-sm"
      aria-label="Export credentials as CSV"
    >
      {loading ? (
        <Spinner size={13} className="animate-spin" aria-hidden />
      ) : (
        <DownloadSimple size={13} aria-hidden />
      )}
      Export CSV
    </button>
  );
}
