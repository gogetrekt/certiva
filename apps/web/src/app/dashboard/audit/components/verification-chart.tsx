"use client";

import { useCallback, useState } from "react";
import type { AnalyticsBucket, VerificationAnalytics } from "../../../../lib/api";
import { useLanguage } from "../../../../lib/i18n";

type Period = 7 | 30 | 90;

function formatBucketDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function BarChart({ buckets }: { buckets: AnalyticsBucket[] }) {
  const { t } = useLanguage();
  const maxVal = Math.max(...buckets.map((b) => b.total), 1);
  const labelInterval = buckets.length <= 7 ? 1 : buckets.length <= 30 ? 5 : 15;

  return (
    <div
      className="relative min-h-56 rounded-lg border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-subtle))] px-4 pb-9 pt-8"
      role="img"
      aria-label={t.auditComponents.verificationChart.aria}
    >
      <div className="pointer-events-none absolute inset-x-4 top-8 bottom-9 flex flex-col justify-between">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-t border-[hsl(var(--border-subtle))]" />
        ))}
      </div>

      <div className="relative grid h-40 grid-flow-col auto-cols-fr items-end gap-1.5 sm:gap-2">
        {buckets.map((bucket, index) => {
          const totalHeight = Math.max((bucket.total / maxVal) * 100, bucket.total > 0 ? 8 : 0);
          const validHeight = bucket.total > 0 ? (bucket.valid / bucket.total) * 100 : 0;
          const invalidHeight = bucket.total > 0 ? (bucket.invalid / bucket.total) * 100 : 0;
          const label = formatBucketDate(bucket.date);
          const showLabel = index % labelInterval === 0 || index === buckets.length - 1;

          return (
            <div
              key={bucket.date}
              className="group relative flex h-full min-w-0 flex-col items-center justify-end"
              title={`${label}: ${bucket.total} ${t.auditComponents.verificationChart.tooltipTotal}, ${bucket.valid} ${t.auditComponents.verificationChart.titleValid}, ${bucket.invalid} ${t.auditComponents.verificationChart.titleInvalid}`}
            >
              <div className="pointer-events-none absolute -top-6 z-10 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-2 py-1 text-[0.625rem] font-medium text-[hsl(var(--text-secondary))] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                {bucket.total}
              </div>

              <div
                className="flex w-full max-w-8 flex-col justify-end overflow-hidden rounded-t-md rounded-b-sm border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] transition-[border-color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:border-[hsl(var(--border-strong))]"
                style={{ height: `${totalHeight}%` }}
              >
                {bucket.valid > 0 ? (
                  <div
                    className="bg-[hsl(var(--status-valid-dot))] opacity-85"
                    style={{ height: `${validHeight}%` }}
                  />
                ) : null}
                {bucket.invalid > 0 ? (
                  <div
                    className="bg-[hsl(var(--status-error-dot))] opacity-75"
                    style={{ height: `${invalidHeight}%` }}
                  />
                ) : null}
                {bucket.total === 0 ? (
                  <div className="h-1.5 rounded-full bg-[hsl(var(--border-default))]" />
                ) : null}
              </div>

              {showLabel ? (
                <span className="absolute -bottom-6 max-w-12 truncate text-[0.625rem] text-[hsl(var(--text-quaternary))]">
                  {label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PeriodTabProps {
  value: Period;
  active: boolean;
  onSelect: (v: Period) => void;
  suffix: string;
}

function PeriodTab({ value, active, onSelect, suffix }: PeriodTabProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`min-h-8 cursor-pointer rounded-md px-2.5 py-1 text-[0.6875rem] font-medium transition-colors ${
        active
          ? "border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-primary))]"
          : "text-[hsl(var(--text-tertiary))] hover:bg-[hsl(var(--bg-subtle))] hover:text-[hsl(var(--text-secondary))]"
      }`}
    >
      {value}
      {suffix}
    </button>
  );
}

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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map(({ label, value, dotClass }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
          <span className="meta-text">{label}</span>
          <span className="font-mono text-[0.75rem] font-semibold tabular-nums text-[hsl(var(--text-primary))]">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SparseDataNote({ buckets }: { buckets: AnalyticsBucket[] }) {
  const { t } = useLanguage();
  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const activeDays = buckets.filter((bucket) => bucket.total > 0).length;

  if (total === 0 || activeDays > 2) return null;

  return (
    <div className="mt-3 rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-base))] px-3 py-2">
      <p className="text-xs font-medium text-[hsl(var(--text-secondary))]">
        {t.auditComponents.verificationChart.sparseTitle}
      </p>
      <p className="mt-0.5 text-[0.6875rem] leading-4 text-[hsl(var(--text-quaternary))]">
        {t.auditComponents.verificationChart.sparseDescription}
      </p>
    </div>
  );
}

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

  const hasData = data.buckets.some((b) => b.total > 0);

  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-[hsl(var(--border-default))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
              suffix={t.auditComponents.verificationChart.daysSuffix}
            />
          ))}
        </div>
      </div>

      {hasData ? (
        <>
          <div className={`px-5 py-5 transition-opacity ${loading ? "opacity-40" : ""}`}>
            <BarChart buckets={data.buckets} />
            <SparseDataNote buckets={data.buckets} />
          </div>

          <div className="border-t border-[hsl(var(--border-subtle))] px-5 py-3">
            <ChartSummary buckets={data.buckets} />
          </div>
        </>
      ) : (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-4 h-24 max-w-sm rounded-lg border border-dashed border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))]" />
          <p className="mb-1 text-xs font-medium text-[hsl(var(--text-secondary))]">
            {t.auditComponents.verificationChart.noDataTitle}
          </p>
          <p className="meta-text mx-auto max-w-xs">
            {t.auditComponents.verificationChart.noDataDescription}
          </p>
        </div>
      )}
    </div>
  );
}

export function VerificationChartSkeleton() {
  const heights = [42, 64, 36, 78, 55, 70, 48];

  return (
    <div className="work-surface overflow-hidden p-0">
      <div className="border-b border-[hsl(var(--border-default))] px-5 py-4">
        <div className="skeleton mb-2 h-2.5 w-16 rounded" />
        <div className="skeleton h-4 w-40 rounded" />
      </div>
      <div className="px-5 py-5">
        <div className="flex h-48 items-end gap-2 rounded-lg border border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-subtle))] p-4">
          {heights.map((height, i) => (
            <div
              key={i}
              className="skeleton flex-1 rounded-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
