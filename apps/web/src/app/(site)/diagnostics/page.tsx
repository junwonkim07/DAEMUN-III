import type { Metadata } from "next";
import { DocumentDiagnostics } from "@/components/site/document-diagnostics";
import { getSite } from "@/lib/site";

export const metadata: Metadata = { title: "Document help", robots: { index: false, follow: false } };

export default async function DiagnosticsPage() {
  const { documents } = await getSite();
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-20">
      <h1 className="font-custom text-4xl text-ink">Document help</h1>
      <p className="mt-4 text-body">If a document will not open, run a link check and send a report below. Share the report reference with the Secretariat so we can find your diagnostic results.</p>
      <DocumentDiagnostics documents={documents} />
    </main>
  );
}
