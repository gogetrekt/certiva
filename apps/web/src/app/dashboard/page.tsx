import { Suspense } from "react";
import Link from "next/link";

import {
  getActivityFeed,
  getDashboardMetrics,
  getLatestIssuances,
  getLatestRevocations,
  getQueueHealth,
  getSessionToken,
  getVerificationAnalytics,
} from "../../lib/api";

import {
  MetricCards,
  MetricCardsSkeleton,
} from "./audit/components/metric-cards";
import {
  ActivityFeed,
  ActivityFeedSkeleton,
} from "./audit/components/activity-feed";
import {
  VerificationChart,
  VerificationChartSkeleton,
} from "./audit/components/verification-chart";
import {
  IssuanceTable,
  RevocationTable,
  TableSkeleton,
} from "./audit/components/issuance-table";
import {
  QueueMonitor,
  QueueMonitorSkeleton,
} from "./audit/components/queue-monitor";
import { ExportButton } from "./audit/components/export-button";
import { InstitutionSetupState } from "../../components/institution-setup-state";
import { isInstitutionSetupRequired, getCurrentAdmin } from "../../lib/api";
import { getServerDictionary } from "../../lib/i18n-server";

export default async function DashboardOverviewPage() {
  const token = await getSessionToken();
  if (!token) return null;

  const admin = await getCurrentAdmin(token);
  const t = await getServerDictionary();

  let metrics, activity, analytics, issuances, revocations, queue;

  try {
    [metrics, activity, analytics, issuances, revocations, queue] =
      await Promise.all([
        getDashboardMetrics(token),
        getActivityFeed(token, { limit: 25 }),
        getVerificationAnalytics(token, 7),
        getLatestIssuances(token, 10),
        getLatestRevocations(token, 10),
        getQueueHealth(token),
      ]);
  } catch (error) {
    if (isInstitutionSetupRequired(error)) {
      return (
        <InstitutionSetupState isSuperAdmin={admin.role === "OWNER" || admin.role === "SUPER_ADMIN"} />
      );
    }
    throw error;
  }

  const institutionLabel =
    admin.issuer?.displayName ?? admin.issuer?.name ?? t.dashboardShell.fallbackInstitution;

  return (
    <div className="space-y-7">
      {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-[hsl(var(--border-default))]">
        <div>
          <p className="kicker mb-2">{institutionLabel}</p>
          <h1 className="page-title">{t.dashboard.overview.title}</h1>
          <p className="body-text mt-1">
            {t.dashboard.overview.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1 shrink-0">
          <Link href="/dashboard/issue" className="btn-primary btn-sm">
            {t.dashboard.overview.issueCredential}
          </Link>
          <Suspense fallback={null}>
            <ExportButton token={token} />
          </Suspense>
        </div>
      </div>

      {/* â”€â”€ Metric cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section aria-label={t.dashboard.overview.keyMetricsAria}>
        <Suspense fallback={<MetricCardsSkeleton />}>
          <MetricCards metrics={metrics} />
        </Suspense>
      </section>

      {/* â”€â”€ Chart + queue monitor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section aria-label={t.dashboard.overview.verificationAnalyticsAria}>
          <Suspense fallback={<VerificationChartSkeleton />}>
            <VerificationChart initialData={analytics} />
          </Suspense>
        </section>

        <section aria-label={t.dashboard.overview.queueHealthAria}>
          <Suspense fallback={<QueueMonitorSkeleton />}>
            <QueueMonitor initialData={queue} />
          </Suspense>
        </section>
      </div>

      {/* â”€â”€ Activity feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section aria-label={t.dashboard.overview.recentActivityAria}>
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeed
            initialItems={activity.items}
            initialTotal={activity.total}
            token={token}
          />
        </Suspense>
      </section>

      {/* â”€â”€ Latest issuances + revocations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-label={t.dashboard.overview.latestIssuancesAria}>
          <Suspense fallback={<TableSkeleton />}>
            <IssuanceTable items={issuances} />
          </Suspense>
        </section>

        <section aria-label={t.dashboard.overview.latestRevocationsAria}>
          <Suspense fallback={<TableSkeleton />}>
            <RevocationTable items={revocations} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

