import Link from "next/link";

import { SiteHeader } from "../components/site-header";
import { getServerDictionary } from "../lib/i18n-server";

export default async function NotFound() {
  const t = await getServerDictionary();

  return (
    <div className="min-h-dvh bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
      <SiteHeader />
      <div className="mx-auto max-w-275 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="work-surface mx-auto max-w-md p-8 text-center">
          <p className="kicker mb-3">404</p>
          <h1 className="section-title">{t.errorStates.notFoundTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--text-secondary))]">
            {t.errorStates.notFoundDescription}
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/" className="btn-primary">
              {t.errorStates.goHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
