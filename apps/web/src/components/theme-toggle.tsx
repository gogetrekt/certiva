"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";

import { useLanguage } from "../lib/i18n";
import { useHydrated } from "../lib/use-hydrated";

const THEME_EVENT = "certiva-theme-change";

function subscribeTheme(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
}

// Source of truth is the `dark` class the inline script in the root layout
// sets before hydration, so no in-effect setState is needed to read it.
function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const { t } = useLanguage();
  const mounted = useHydrated();
  const isDark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("certiva-theme", next ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  if (!mounted) {
    return <div className="theme-toggle" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={isDark ? t.common.switchToLight : t.common.switchToDark}
      title={isDark ? t.common.themeLight : t.common.themeDark}
    >
      {isDark ? (
        <Sun size={14} weight="regular" />
      ) : (
        <Moon size={14} weight="regular" />
      )}
    </button>
  );
}
