"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwise,
  CheckCircle,
  Circle,
  Spinner,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

import type { QueueHealthResponse } from "../../../../lib/api";
import { useLanguage } from "../../../../lib/i18n";

// ─── Health indicator ─────────────────────────────────────────────────────────

function HealthIndicator({ health }: { health: QueueHealthResponse["health"] }) {
  const { t } = useLanguage();
  const map = {
    healthy: {
      label: t.auditComponents.queue.healthy,
      dotClass: "dot-valid",
      textClass: "text-[hsl(var(--status-valid-text))]",
      bgClass: "badge-valid",
    },
    warning: {
      label: t.auditComponents.queue.warning,
      dotClass: "dot-warn",
      textClass: "text-[hsl(var(--status-warn-text))]",
      bgClass: "badge-warn",
    },
    critical: {
      label: t.auditComponents.queue.critical,
      dotClass: "dot-error",
      textClass: "text-[hsl(var(--status-error-text))]",
      bgClass: "badge-error",
    },
  };

  const { label, dotClass, bgClass } = map[health];

  return (
    <span className={`badge ${bgClass} inline-flex items-center gap-1.5`}>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass} ${health !== "healthy" ? "animate-pulse" : ""}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────

interface StatCellProps {
  label: string;
  value: number;
  icon: typeof Circle;
  iconClass: string;
}

function StatCell({ label, value, icon: Icon, iconClass }: StatCellProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--border-subtle))] last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={14} className={iconClass} aria-hidden />
        <span className="text-sm text-[hsl(var(--text-secondary))]">{label}</span>
      </div>
      <span className="hash-text text-[hsl(var(--text-primary))] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─── Queue monitor ────────────────────────────────────────────────────────────

interface QueueMonitorProps {
  initialData: QueueHealthResponse;
}

export function QueueMonitor({ initialData }: QueueMonitorProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<QueueHealthResponse>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/audit/queue");
      if (!res.ok) return;
      const d = (await res.json()) as QueueHealthResponse;
      setData(d);
      setLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const cells: StatCellProps[] = [
    {
      label: t.auditComponents.queue.pending,
      value: data.pending,
      icon: Circle,
      iconClass: "text-[hsl(var(--status-warn-dot))]",
    },
    {
      label: t.auditComponents.queue.processing,
      value: data.processing,
      icon: Spinner,
      iconClass: "text-[hsl(var(--text-tertiary))] animate-spin",
    },
    {
      label: t.auditComponents.queue.failed,
      value: data.failed,
      icon: XCircle,
      iconClass: "text-[hsl(var(--status-error-dot))]",
    },
    {
      label: t.auditComponents.queue.completed,
      value: data.completed,
      icon: CheckCircle,
      iconClass: "text-[hsl(var(--status-valid-dot))]",
    },
  ];

  const timeLabel = lastRefreshed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="work-surface overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <div>
          <p className="kicker mb-1">{t.auditComponents.queue.blockchainQueue}</p>
          <h2 className="section-title">{t.auditComponents.queue.queueMonitor}</h2>
        </div>
        <div className="flex items-center gap-2">
          <HealthIndicator health={data.health} />
          <button
            onClick={refresh}
            disabled={refreshing}
            className="theme-toggle"
            aria-label={t.auditComponents.queue.refreshAria}
            title={t.auditComponents.queue.refreshTitle}
          >
            <ArrowClockwise
              size={13}
              className={refreshing ? "animate-spin" : ""}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5">
        {data.pending === 0 && data.processing === 0 && data.failed === 0 ? (
          <p className="py-4 text-xs text-[hsl(var(--text-tertiary))]">
            {t.auditComponents.queue.noActiveJobs}
          </p>
        ) : (
          cells.map((cell) => (
            <StatCell key={cell.label} {...cell} />
          ))
        )}
      </div>

      {/* Health note */}
      {data.health !== "healthy" && (
        <div className="mx-5 mb-4 mt-1 flex items-start gap-2 px-3 py-2.5 rounded-md bg-[hsl(var(--status-warn-bg))] border border-[hsl(var(--status-warn-border))]">
          <Warning
            size={13}
            className="text-[hsl(var(--status-warn-dot))] mt-0.5 shrink-0"
            aria-hidden
          />
          <p className="text-xs text-[hsl(var(--status-warn-text))] leading-snug">
            {data.health === "critical"
              ? `${data.failed} ${t.auditComponents.queue.criticalMessageSuffix}`
              : `${data.failed} ${
                  data.failed === 1
                    ? t.auditComponents.queue.warningJob
                    : t.auditComponents.queue.warningJobs
                }`}
          </p>
        </div>
      )}

      {/* Last refreshed */}
      <div className="px-5 pb-4 flex items-center justify-end">
        <span className="meta-text text-[hsl(var(--text-quaternary))] text-[10px]">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}

export function QueueMonitorSkeleton() {
  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <div className="skeleton h-2.5 w-24 rounded mb-2" />
        <div className="skeleton h-4 w-36 rounded" />
      </div>
      <div className="px-5 divide-y divide-[hsl(var(--border-subtle))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-3 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
