"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useState } from "react";

type AdminRole = "OWNER" | "SUPER_ADMIN" | "ADMIN" | "AUDITOR";

export function AdminStatusForm({
  adminId,
  username,
  role,
  active,
  disabled,
}: {
  adminId: string;
  username: string;
  role: AdminRole;
  active: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeleteOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDeleteOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isDeleteOpen]);

  async function update(payload: {
    role?: AdminRole;
    active?: boolean;
  }) {
    setIsSubmitting(true);
    try {
      await fetch(`/api/admins/${adminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAdmin() {
    setIsSubmitting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admins/${adminId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Unable to delete admin account");
      }
      setIsDeleteOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete admin account",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {(role === "SUPER_ADMIN" || role === "ADMIN") && (
          <button
            type="button"
            disabled={disabled || isSubmitting}
            onClick={() =>
              update({ role: role === "SUPER_ADMIN" ? "ADMIN" : "SUPER_ADMIN" })
            }
            className="btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {role === "SUPER_ADMIN" ? "Set as admin" : "Set as super admin"}
          </button>
        )}
        <button
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => update({ active: !active })}
          className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
            active
              ? "border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] text-[hsl(var(--status-error-text))] hover:opacity-80"
              : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] text-[hsl(var(--text-secondary))] hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--text-primary))]"
          }`}
        >
          {active ? "Deactivate" : "Reactivate"}
        </button>
        {!active && !disabled ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setDeleteError(null);
              setIsDeleteOpen(true);
            }}
            className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Delete
          </button>
        ) : null}
      </div>

      {isDeleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-[hsl(var(--bg-canvas))]/80 backdrop-blur-sm"
            onClick={() => setIsDeleteOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] shadow-2xl"
          >
            <div className="border-b border-[hsl(var(--border-default))] px-6 py-5">
              <p
                id={titleId}
                className="text-sm font-semibold text-[hsl(var(--text-primary))]"
              >
                Delete admin account?
              </p>
            </div>
            <div id={descriptionId} className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-subtle))] px-4 py-3">
                <p className="kicker mb-1.5">Account</p>
                <p className="break-all text-sm font-medium text-[hsl(var(--text-primary))]">
                  @{username}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs leading-5 text-[hsl(var(--status-error-text))]">
                <p>This action permanently removes this account.</p>
                <p className="mt-2">
                  Accounts with existing credentials, verification activity,
                  audit logs, or related records cannot be deleted.
                </p>
                <p className="mt-2">This action cannot be undone.</p>
              </div>
              {deleteError ? (
                <div className="rounded-lg border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-4 py-3 text-xs text-[hsl(var(--status-error-text))]">
                  {deleteError}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border-default))] px-6 py-4">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAdmin}
                disabled={isSubmitting}
                className="inline-flex items-center rounded border border-[hsl(var(--status-error-border))] bg-[hsl(var(--status-error-bg))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--status-error-text))] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
