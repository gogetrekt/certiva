"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";

import { useLanguage, type Language } from "../lib/i18n";
import { useHydrated } from "../lib/use-hydrated";

export function LanguageToggle() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const mounted = useHydrated();

  if (!mounted) {
    return <div className="lang-toggle" aria-hidden="true" />;
  }

  function handleClick(lang: Language) {
    if (lang === language) return;
    setLanguage(lang);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="lang-toggle" role="group" aria-label={t.common.selectLanguage}>
      <button
        type="button"
        onClick={() => handleClick("en")}
        className={
          language === "en"
            ? "lang-toggle__btn lang-toggle__btn--active"
            : "lang-toggle__btn"
        }
        aria-pressed={language === "en"}
      >
        EN
      </button>
      <span className="lang-toggle__sep" aria-hidden="true">/</span>
      <button
        type="button"
        onClick={() => handleClick("id")}
        className={
          language === "id"
            ? "lang-toggle__btn lang-toggle__btn--active"
            : "lang-toggle__btn"
        }
        aria-pressed={language === "id"}
      >
        ID
      </button>
    </div>
  );
}
