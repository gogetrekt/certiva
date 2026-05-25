import { cookies } from "next/headers";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  dictionaries,
  normalizeLanguage,
  type Dictionary,
  type Language,
} from "./i18n-dictionary";

export async function getServerLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return (
    normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE_NAME)?.value) ??
    DEFAULT_LANGUAGE
  );
}

export async function getServerDictionary(): Promise<Dictionary> {
  return dictionaries[await getServerLanguage()];
}

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language];
}
