"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

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

const LANGUAGE_EVENT = "certiva-language-change";

function subscribeLanguage(cb: () => void) {
  window.addEventListener(LANGUAGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const language = useSyncExternalStore(
    subscribeLanguage,
    () =>
      normalizeLanguage(localStorage.getItem(STORAGE_KEY)) ??
      readLanguageCookie() ??
      initialLanguage,
    () => initialLanguage,
  );

  // Persist the resolved language + <html lang> to external systems. No
  // setState here, so it stays clear of react-hooks/set-state-in-effect.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    writeLanguageCookie(language);
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(lang: Language) {
    localStorage.setItem(STORAGE_KEY, lang);
    writeLanguageCookie(lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
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
