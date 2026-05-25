"use client";

import { createContext, useContext, useEffect, useState } from "react";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  STORAGE_KEY,
  dictionaries,
  normalizeLanguage,
  type Dictionary,
  type Language,
} from "./i18n-dictionary";

export { dictionaries, type Dictionary, type Language };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: dictionaries[DEFAULT_LANGUAGE],
});

function readLanguageCookie() {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LANGUAGE_COOKIE_NAME}=`));

  return normalizeLanguage(match?.split("=")[1]);
}

function writeLanguageCookie(lang: Language) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const stored =
      normalizeLanguage(localStorage.getItem(STORAGE_KEY)) ??
      readLanguageCookie() ??
      initialLanguage;

    setLanguageState(stored);
    localStorage.setItem(STORAGE_KEY, stored);
    writeLanguageCookie(stored);
    document.documentElement.lang = stored;
  }, [initialLanguage]);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    writeLanguageCookie(lang);
    document.documentElement.lang = lang;
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: dictionaries[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
