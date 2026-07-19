"use client";

import {
  dictionaries,
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  normalizeLanguage,
} from "../lib/i18n-dictionary";

// ponytail: global-error replaces the root layout, so no LanguageProvider and no
// globals.css are available here. Read the lang cookie directly and inline the styles.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang =
    (typeof document !== "undefined"
      ? normalizeLanguage(
          document.cookie
            .split("; ")
            .find((c) => c.startsWith(`${LANGUAGE_COOKIE_NAME}=`))
            ?.split("=")[1],
        )
      : null) ?? DEFAULT_LANGUAGE;
  const t = dictionaries[lang].errorStates;

  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#fafafa",
          color: "#18181b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "26rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid #e4e4e7",
            borderRadius: "0.75rem",
            background: "#ffffff",
            padding: "2rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
            {t.globalTitle}
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#52525b",
            }}
          >
            {t.globalDescription}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              cursor: "pointer",
              border: "none",
              borderRadius: "0.5rem",
              background: "#18181b",
              color: "#fafafa",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {t.globalRetry}
          </button>
        </div>
      </body>
    </html>
  );
}
