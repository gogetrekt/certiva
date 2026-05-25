"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { useLanguage } from "../lib/i18n";

export function ThemeToggle() {
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("certiva-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("certiva-theme", next ? "dark" : "light");
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
