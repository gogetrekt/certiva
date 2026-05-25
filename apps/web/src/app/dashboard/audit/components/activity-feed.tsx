"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CaretRight,
  CheckCircle,
  FileMagnifyingGlass,
  QrCode,
  X,
  XCircle,
} from "@phosphor-icons/react";

import type { ActivityFeedItem } from "../../../../lib/api";
import { formatDateTime } from "../../../../lib/date-format";
import { useLanguage } from "../../../../lib/i18n";

// --- Status badge -------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    VALID: "badge-valid",
    INVALID: "badge-error",
    REVOKED: "badge-error",
    NOT_FOUND: "badge-neutral",
    TAMPERED: "badge-warn",
  };
  const labels: Record<string, string> = {
    VALID: t.common.valid,
    INVALID: t.common.invalid,
    REVOKED: t.common.revoked,
    NOT_FOUND: t.common.notFound,
    TAMPERED: t.common.tampered,
  };

  return (
    <span className={`badge ${map[status] ?? "badge-neutral"}`}>
      {labels[status] ?? status.replace("_", " ")}
    </span>
  );
}

// --- Action icon --------------------------------------------------------------

function ActionIcon({ action, status }: { action: string; status: string }) {
  const ok = status === "VALID";
  const cls = `shrink-0 ${ok ? "text-[hsl(var(--status-valid-dot))]" : "text-[hsl(var(--status-error-dot))]"}`;

  if (action.includes("QR")) return <QrCode size={14} weight="duotone" className={cls} aria-hidden />;
  if (action.includes("PDF")) return <FileMagnifyingGlass size={14} weight="duotone" className={cls} aria-hidden />;
  if (ok) return <CheckCircle size={14} weight="duotone" className={cls} aria-hidden />;
  return <XCircle size={14} weight="duotone" className={cls} aria-hidden />;
}

// --- Detail drawer ------------------------------------------------------------

interface DrawerProps {
  item: ActivityFeedItem | null;
  onClose: () => void;
}

function DetailDrawer({ item, onClose }: DrawerProps) {
  const { t } = useLanguage();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [item, onClose]);

  // Focus trap on open
  useEffect(() => {
    if (item) drawerRef.current?.focus();
  }, [item]);

  if (!item) return null;

  const rows: [string, string | null | boolean][] = [
    [t.auditComponents.activityFeed.rows.credentialId, item.credentialId],
    [t.auditComponents.activityFeed.rows.action, item.action],
    [t.auditComponents.activityFeed.rows.status, item.status],
    [t.auditComponents.activityFeed.rows.student, item.studentName],
    [t.auditComponents.activityFeed.rows.degree, item.degree],
    [t.auditComponents.activityFeed.rows.institution, item.institution],
    [t.auditComponents.activityFeed.rows.ipAddress, item.ipAddress],
    [t.auditComponents.activityFeed.rows.hashMatched, item.matched ? t.common.yes : t.common.no],
    [t.auditComponents.activityFeed.rows.occurredAt, formatDateTime(item.occurredAt)],
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[hsl(var(--z-950)/0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t.auditComponents.activityFeed.detailLabel}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-[hsl(var(--bg-base))] border-l border-[hsl(var(--border-default))] flex flex-col outline-none"
        style={{ boxShadow: "-20px 0 40px -10px hsl(var(--z-950)/0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border-default))] shrink-0">
          <div>
            <p className="kicker mb-0.5">{t.auditComponents.activityFeed.detailTitle}</p>
            <p className="section-title truncate max-w-[220px]">{item.action}</p>
          </div>
          <button
            onClick={onClose}
            className="theme-toggle ml-2"
            aria-label={t.auditComponents.activityFeed.closeDetail}
          >
            <X size={14} aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-start gap-3 py-3 border-b border-[hsl(var(--border-subtle))] last:border-0"
            >
              <p className="kicker w-28 shrink-0 pt-0.5">{label}</p>
              <p className="body-text break-all leading-snug">
                {value === null || value === undefined || value === "" ? (
                  <span className="text-[hsl(var(--text-quaternary))]">-</span>
                ) : (
                  String(value)
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        {item.credentialDbId && (
          <div className="shrink-0 px-5 py-4 border-t border-[hsl(var(--border-default))]">
            <Link
              href={`/dashboard/credentials/${item.credentialDbId}`}
              className="btn-ghost w-full justify-between"
            >
              {t.auditComponents.activityFeed.viewFullRecord}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

// --- Activity feed ------------------------------------------------------------

interface ActivityFeedProps {
  initialItems: ActivityFeedItem[];
  initialTotal: number;
  token: string;
}

export function ActivityFeed({ initialItems, initialTotal, token }: ActivityFeedProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<ActivityFeedItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ActivityFeedItem | null>(null);
  const PAGE_SIZE = 25;

  const loadMore = useCallback(async () => {
    if (loading || items.length >= total) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/audit/activity?limit=${PAGE_SIZE}&offset=${items.length}`,
        { headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { items: ActivityFeedItem[]; total: number };
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [items.length, total, loading]);

  return (
    <>
      <DetailDrawer item={selected} onClose={() => setSelected(null)} />

      <div className="work-surface overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border-default))]">
          <div>
            <p className="kicker mb-1">{t.auditComponents.activityFeed.liveFeed}</p>
            <h2 className="section-title">{t.auditComponents.activityFeed.recentActivity}</h2>
          </div>
          <p className="meta-text">
            {items.length} {t.auditComponents.activityFeed.of} {total}
          </p>
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="body-text">{t.auditComponents.activityFeed.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="th-cell">{t.auditComponents.activityFeed.time}</th>
                  <th className="th-cell">{t.auditComponents.activityFeed.action}</th>
                  <th className="th-cell">{t.auditComponents.activityFeed.credentialId}</th>
                  <th className="th-cell">{t.auditComponents.activityFeed.student}</th>
                  <th className="th-cell">{t.common.status}</th>
                  <th className="th-cell w-8" aria-label={t.auditComponents.activityFeed.openDetail} />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(item)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${t.auditComponents.activityFeed.viewDetailPrefix} ${item.credentialId}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(item);
                    }}
                  >
                    <td className="td-cell-sm whitespace-nowrap">
                      <p className="meta-text font-mono">
                        {new Date(item.occurredAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="meta-text">
                        {new Date(item.occurredAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <div className="flex items-center gap-2">
                        <ActionIcon action={item.action} status={item.status} />
                        <span className="text-sm text-[hsl(var(--text-primary))]">
                          {item.action}
                        </span>
                      </div>
                    </td>
                    <td className="td-cell-sm max-w-[180px]">
                      <p className="hash-text text-[hsl(var(--text-secondary))] truncate">
                        {item.credentialId}
                      </p>
                    </td>
                    <td className="td-cell-sm">
                      <p className="text-sm text-[hsl(var(--text-primary))] truncate max-w-[140px]">
                        {item.studentName ?? "-"}
                      </p>
                      {item.institution && (
                        <p className="meta-text truncate max-w-[140px]">{item.institution}</p>
                      )}
                    </td>
                    <td className="td-cell-sm">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="td-cell-sm">
                      <CaretRight
                        size={12}
                        className="text-[hsl(var(--text-quaternary))]"
                        aria-hidden
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {items.length < total && (
          <div className="px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn-ghost btn-sm w-full justify-center"
            >
              {loading
                ? t.auditComponents.activityFeed.loading
                : `${t.auditComponents.activityFeed.loadMorePrefix} (${total - items.length} ${t.auditComponents.activityFeed.remaining})`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <div className="skeleton h-2.5 w-16 rounded mb-2" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
      <div className="divide-y divide-[hsl(var(--border-subtle))]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-4">
            <div className="skeleton h-3 w-14 rounded" />
            <div className="skeleton h-3 w-36 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-5 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
