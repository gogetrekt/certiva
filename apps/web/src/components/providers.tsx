"use client";

import { LanguageProvider } from "../lib/i18n";
import type { Language } from "../lib/i18n-dictionary";

export function Providers({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage: Language;
}) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      {children}
    </LanguageProvider>
  );
}
