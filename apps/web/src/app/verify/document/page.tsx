import type { Metadata } from "next";

import { DocumentPageContent } from "../../../components/document-page-content";
import { getServerDictionary } from "../../../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();

  return {
    title: t.nav.documentCheck,
    description: t.metadata.documentDescription,
  };
}

export default function VerifyDocumentPage() {
  return <DocumentPageContent />;
}
