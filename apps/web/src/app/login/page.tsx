import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginPageContent } from "../../components/login-page-content";
import { getCurrentAdmin, getSessionToken } from "../../lib/api";
import { getServerDictionary } from "../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.nav.signIn,
    description: t.metadata.loginDescription,
  };
}

export default async function LoginPage() {
  const token = await getSessionToken();
  if (token) {
    try {
      await getCurrentAdmin(token);
      redirect("/dashboard");
    } catch {
      // Token invalid -- fall through to show the login form.
    }
  }

  return <LoginPageContent />;
}
