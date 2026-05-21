"use client";

import {
  ArrowCounterClockwise,
  CheckCircle,
  Cube,
  IdentificationCard,
  ShieldCheck,
  Timer,
} from "@phosphor-icons/react";

import type { DashboardMetrics } from "../../../../lib/api";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

interface CardDef {
  label: string;
  value: string;
  note: string;
  icon: typeof IdentificationCard;
  variant: "default" | "valid" | "warn" | "error";
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards: CardDef[] = [
    {
      label: "Issued",
      value: String(metrics.totalIssued),
      note: "Total credentials issued",
      icon: IdentificationCard,
      variant: "default",
    },
    {
      label: "Verified",
      value: String(metrics.totalVerified),
      note: "Total verification events",
      icon: CheckCircle,
      variant: "valid",
    },
    {
      label: "Revoked",
      value: String(metrics.revokedCount),
      note: "Credentials revoked",
      icon: ArrowCounterClockwise,
      variant: metrics.revokedCount > 0 ? "error" : "default",
    },
    {
      label: "Pending Anchor",
      value: String(metrics.pendingAnchor),
      note: "Awaiting blockchain confirmation",
      icon: Timer,
      variant: metrics.pendingAnchor > 0 ? "warn" : "default",
    },
    {
      label: "Success Rate",
      value: `${metrics.successRate}%`,
      note: "Verifications passed",
      icon: ShieldCheck,
      variant: metrics.successRate >= 95 ? "valid" : metrics.successRate >= 80 ? "warn" : "error",
    },
    {
      label: "Active Credentials",
      value: String(metrics.activeCredentials),
      note: "Issued minus revoked",
      icon: Cube,
      variant: "default",
    },
  ];

  return (
    <div className="metric-strip grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <MetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  variant,
}: CardDef) {
  const dotClass =
    variant === "valid"
      ? "dot-valid"
      : variant === "warn"
        ? "dot-warn"
        : variant === "error"
          ? "dot-error"
          : "dot-neutral";

  return (
    <div className="metric-cell group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="kicker">{label}</p>
        <Icon
          size={13}
          className="shrink-0 text-[hsl(var(--text-quaternary))] mt-0.5"
          aria-hidden
        />
      </div>
      <p className="kpi-value">{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}
          aria-hidden
        />
        <p className="meta-text">{note}</p>
      </div>
    </div>
  );
}

export function MetricCardsSkeleton() {
  return (
    <div className="metric-strip grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="metric-cell space-y-3">
          <div className="skeleton h-2.5 w-20 rounded" />
          <div className="skeleton h-8 w-16 rounded" />
          <div className="skeleton h-2 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}
