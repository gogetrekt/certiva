import type { Metadata } from "next";

import { VerifyPageContent } from "../../components/verify-page-content";
import { getServerDictionary } from "../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.nav.credentialCheck,
    description: t.metadata.verifyDescription,
  };
}

export default function VerifyPage() {
  return <VerifyPageContent />;
}
