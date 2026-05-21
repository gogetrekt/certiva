import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--bg-subtle))] px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))]">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden className="text-[hsl(var(--text-quaternary))]">
          <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" opacity="0.6"/>
          <rect x="2" y="7" width="8" height="2" rx="1" fill="currentColor" opacity="0.4"/>
          <rect x="2" y="11" width="10" height="2" rx="1" fill="currentColor" opacity="0.25"/>
        </svg>
      </div>
      <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-[hsl(var(--text-tertiary))]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
