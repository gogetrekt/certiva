"use client";

import { useCallback, useState } from "react";
import type { AnalyticsBucket, VerificationAnalytics } from "../../../../lib/api";
import { useLanguage } from "../../../../lib/i18n";

// ─── Bar chart (pure CSS, no external lib) ───────────────────────────────────

function BarChart({ buckets }: { buckets: AnalyticsBucket[] }) {
  const { t } = useLanguage();
  const maxVal = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <div
      className="flex items-end gap-1 h-32 w-full"
      role="img"
      aria-label={t.auditComponents.verificationChart.aria}
    >
      {buckets.map((bucket) => {
        const heightPct = Math.max((bucket.total / maxVal) * 100, 2);
        const date = new Date(bucket.date);
        const label = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

        return (
          <div
            key={bucket.date}
            className="group flex-1 flex flex-col items-center gap-1 cursor-default"
            title={`${label}: ${bucket.total} ${bucket.total === 1 ? t.common.verificationSingular : t.common.verificationPlural} (${bucket.valid} ${t.auditComponents.verificationChart.titleValid}, ${bucket.invalid} ${t.auditComponents.verificationChart.titleInvalid})`}
          >
            <div className="relative w-full flex flex-col justify-end" style={{ height: "100px" }}>
              {/* Valid portion */}
              {bucket.valid > 0 && (
                <div
                  className="w-full rounded-t-[2px] bg-[hsl(var(--status-valid-dot))] opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ height: `${(bucket.valid / maxVal) * 100}%` }}
                />
              )}
              {/* Invalid stacked */}
              {bucket.invalid > 0 && (
                <div
                  className="w-full bg-[hsl(var(--status-error-dot))] opacity-70 group-hover:opacity-90 transition-opacity"
                  style={{ height: `${(bucket.invalid / maxVal) * 100}%` }}
                />
              )}
              {/* Empty bar placeholder */}
              {bucket.total === 0 && (
                <div className="w-full rounded-[2px] bg-[hsl(var(--bg-muted))]" style={{ height: "4px" }} />
              )}
            </div>
            {/* Count label */}
            <span
              className="hash-text text-[10px] text-[hsl(var(--text-quaternary))] group-hover:text-[hsl(var(--text-tertiary))] transition-colors"
              aria-hidden
            >
              {bucket.total || ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day labels row ───────────────────────────────────────────────────────────

function DayLabels({ buckets, days }: { buckets: AnalyticsBucket[]; days: number }) {
  const interval = days <= 7 ? 1 : days <= 30 ? 5 : 15;

  return (
    <div className="flex gap-1 mt-1 w-full">
      {buckets.map((bucket, i) => {
        const show = i % interval === 0 || i === buckets.length - 1;
        const date = new Date(bucket.date);
        const label = date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        return (
          <div key={bucket.date} className="flex-1 text-center">
            {show && (
              <span className="meta-text" style={{ fontSize: "9px" }}>
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Period selector ──────────────────────────────────────────────────────────

type Period = 7 | 30 | 90;

interface PeriodTabProps {
  value: Period;
  active: boolean;
  onSelect: (v: Period) => void;
}

function PeriodTab({ value, active, onSelect }: PeriodTabProps) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`px-2.5 py-1 text-[0.6875rem] font-medium rounded-md transition-colors cursor-pointer ${active
          ? "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))] border border-[hsl(var(--border-default))]"
          : "text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]"
        }`}
    >
      {value}d
    </button>
  );
}

// ─── Summary row ─────────────────────────────────────────────────────────────

function ChartSummary({ buckets }: { buckets: AnalyticsBucket[] }) {
  const { t } = useLanguage();
  const totalValid = buckets.reduce((s, b) => s + b.valid, 0);
  const totalInvalid = buckets.reduce((s, b) => s + b.invalid, 0);
  const totalAll = totalValid + totalInvalid;
  const rate = totalAll > 0 ? Math.round((totalValid / totalAll) * 100) : 0;

  const items = [
    { label: t.auditComponents.verificationChart.total, value: String(totalAll), dotClass: "dot-neutral" },
    { label: t.auditComponents.verificationChart.valid, value: String(totalValid), dotClass: "dot-valid" },
    { label: t.auditComponents.verificationChart.invalid, value: String(totalInvalid), dotClass: "dot-error" },
    { label: t.auditComponents.verificationChart.passRate, value: `${rate}%`, dotClass: rate >= 90 ? "dot-valid" : rate >= 70 ? "dot-warn" : "dot-error" },
  ];

  return (
    <div className="flex items-center gap-5 flex-wrap">
      {items.map(({ label, value, dotClass }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} aria-hidden />
          <span className="meta-text">{label}</span>
          <span className="text-[0.75rem] font-semibold font-mono text-[hsl(var(--text-primary))] tabular-nums">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface VerificationChartProps {
  initialData: VerificationAnalytics;
}

export function VerificationChart({ initialData }: VerificationChartProps) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>((initialData.days as Period) ?? 7);
  const [data, setData] = useState<VerificationAnalytics>(initialData);
  const [loading, setLoading] = useState(false);

  const changePeriod = useCallback(async (days: Period) => {
    if (days === period) return;
    setPeriod(days);
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/analytics?days=${days}`);
      if (!res.ok) return;
      const d = (await res.json()) as VerificationAnalytics;
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [period]);

  return (
    <div className="work-surface overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <div>
          <p className="kicker mb-1">{t.auditComponents.verificationChart.analytics}</p>
          <h2 className="section-title">{t.auditComponents.verificationChart.activity}</h2>
        </div>
        <div className="flex items-center gap-1">
          {([7, 30, 90] as Period[]).map((p) => (
            <PeriodTab
              key={p}
              value={p}
              active={period === p}
              onSelect={changePeriod}
            />
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className={`px-5 pt-5 pb-3 transition-opacity ${loading ? "opacity-40" : ""}`}>
        <BarChart buckets={data.buckets} />
        <DayLabels buckets={data.buckets} days={period} />
      </div>

      {/* Summary */}
      <div className="px-5 py-3 border-t border-[hsl(var(--border-subtle))]">
        <ChartSummary buckets={data.buckets} />
      </div>
    </div>
  );
}

export function VerificationChartSkeleton() {
  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-[hsl(var(--border-default))]">
        <div className="skeleton h-2.5 w-16 rounded mb-2" />
        <div className="skeleton h-4 w-40 rounded" />
      </div>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-end gap-1 h-32">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 skeleton rounded-t"
              style={{ height: `${30 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
