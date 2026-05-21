"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

interface DisclosurePanelProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function DisclosurePanel({ summary, children, defaultOpen = false }: DisclosurePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-4 py-3 text-left text-sm font-medium text-[hsl(var(--text-secondary))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--text-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--border-focus))]"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <CaretDown
          size={13}
          weight="bold"
          className={`shrink-0 text-[hsl(var(--text-quaternary))] transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
          aria-hidden
        />
      </button>
      {isOpen ? <div className="mt-4 space-y-4">{children}</div> : null}
    </div>
  );
}
