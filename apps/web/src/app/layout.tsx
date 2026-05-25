import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/providers";
import { getServerDictionary, getServerLanguage } from "../lib/i18n-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: {
      default: "Certiva",
      template: "%s | Certiva",
    },
    description: t.metadata.defaultDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getServerLanguage();

  return (
    <html
      lang={language}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline theme script -- prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('certiva-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t===null&&m)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-[hsl(var(--bg-canvas))] text-[hsl(var(--text-primary))]">
        <Providers initialLanguage={language}>{children}</Providers>
      </body>
    </html>
  );
}
