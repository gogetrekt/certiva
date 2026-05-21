"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { FileArrowUp, ArrowRight } from "@phosphor-icons/react";

import { StatusBadge } from "./status-badge";

type BulkIssueMode = "preview" | "issue";

type BulkIssueRowStatus =
  | "VALID"
  | "INVALID"
  | "DUPLICATE"
  | "EXISTS"
  | "ISSUED"
  | "FAILED";

interface BulkIssueRowResult {
  rowNumber: number;
  studentName: string;
  studentId: string;
  degree: string;
  metadataUri?: string;
  status: BulkIssueRowStatus;
  message?: string;
  verificationId?: string;
}

interface BulkIssueResponse {
  mode: BulkIssueMode;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  issuedRows: number;
  failedRows: number;
  rows: BulkIssueRowResult[];
}

interface BulkIssueCredentialsProps {
  institutionName?: string;
}

export function BulkIssueCredentials({ institutionName }: BulkIssueCredentialsProps) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [preview, setPreview] = useState<BulkIssueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const canPreview = csvText.trim().length > 0;
  const canIssue = preview?.mode === "preview" && preview.validRows > 0;

  const sortedRows = useMemo(() => {
    if (!preview) return [];
    return [...preview.rows].sort((a, b) => a.rowNumber - b.rowNumber);
  }, [preview]);

  async function loadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setFileSize(file.size);
    setPreview(null);
    setSuccess(null);
    setError(null);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadFile(file);
  }

  async function handlePreview() {
    if (!canPreview) { setError("Upload a CSV before previewing."); return; }
    setIsPreviewing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/credentials/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, commit: false }),
      });
      const body = (await response.json()) as BulkIssueResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Unable to preview CSV data.");
      setPreview(body);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to preview CSV data.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleIssue() {
    if (!canPreview) { setError("Upload a CSV before issuing."); return; }
    setIsIssuing(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/credentials/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, commit: true }),
      });
      const body = (await response.json()) as BulkIssueResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Unable to issue credentials.");
      setPreview(body);
      setSuccess(`Issued ${body.issuedRows} credential(s). ${body.failedRows} failed.`);
      startTransition(() => { router.refresh(); });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to issue credentials.");
    } finally {
      setIsIssuing(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void loadFile(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function handleReset() {
    setCsvText("");
    setFileName(null);
    setFileSize(null);
    setPreview(null);
    setSuccess(null);
    setError(null);
  }

  return (
    <div className="space-y-5">
      {institutionName ? (
        <div className="space-y-1.5">
          <p className="field-label">Institution</p>
          <input value={institutionName} readOnly disabled className="field-shell w-full text-sm opacity-60" />
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="field-label">Upload CSV</p>
        <label
          htmlFor="csvFile"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-5 text-center transition-colors hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--bg-muted))]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] text-[hsl(var(--text-secondary))]">
            <FileArrowUp size={16} />
          </div>
          <div>
            <p className="text-xs font-mono text-[hsl(var(--text-tertiary))] mb-1">CSV format: studentName, studentId, degree</p>
            <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{fileName ?? "Drop CSV here or click to browse"}</p>
            {fileName ? (
              <p className="text-xs text-[hsl(var(--text-quaternary))]">{fileSize !== null ? formatBytes(fileSize) : ""} · Click to change</p>
            ) : (
              <p className="text-xs text-[hsl(var(--text-quaternary))]">One file at a time.</p>
            )}
          </div>
        </label>
        <input id="csvFile" type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canPreview || isPreviewing}
            onClick={handlePreview}
            className="btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPreviewing ? "Previewing…" : "Preview rows"}
          </button>
          <button
            type="button"
            disabled={!canIssue || isIssuing}
            onClick={handleIssue}
            className="btn-primary btn-sm inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isIssuing ? "Issuing…" : "Issue credentials"}
            {!isIssuing && <ArrowRight size={11} weight="bold" />}
          </button>
          <button
            type="button"
            disabled={!csvText && !preview}
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 text-xs font-medium text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">{error}</div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-[hsl(var(--status-valid-border))] bg-[hsl(var(--status-valid-bg))] px-4 py-3 text-xs text-[hsl(var(--status-valid-text))]">{success}</div>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          <div className="metric-strip grid-cols-5">
            {[
              { label: "Total rows", value: preview.totalRows },
              { label: "Valid", value: preview.validRows },
              { label: "Invalid", value: preview.invalidRows },
              { label: "Issued", value: preview.issuedRows },
              { label: "Failed", value: preview.failedRows },
            ].map((tile) => (
              <div key={tile.label} className="metric-cell">
                <p className="kicker mb-1">{tile.label}</p>
                <p className="kpi-value">{tile.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border-default))]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border-default))]">
                  <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-widest text-[hsl(var(--text-quaternary))]">Row</th>
                  <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-widest text-[hsl(var(--text-quaternary))]">Student</th>
                  <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-widest text-[hsl(var(--text-quaternary))]">Credential</th>
                  <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-widest text-[hsl(var(--text-quaternary))]">Status</th>
                  <th className="px-4 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-widest text-[hsl(var(--text-quaternary))]">Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={`${row.rowNumber}-${row.studentId}-${row.degree}`} className={i % 2 === 0 ? "bg-[hsl(var(--bg-subtle))]" : "bg-[hsl(var(--bg-base))]"}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-tertiary))]">#{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{row.studentName || "—"}</p>
                      <p className="text-xs text-[hsl(var(--text-tertiary))]">{row.studentId || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[hsl(var(--text-secondary))]">{row.degree || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-tertiary))]">
                      {row.verificationId ? "Issued successfully" : (row.message ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
