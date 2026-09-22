import type { SiteDocument } from "@daemun/shared";
import { DocumentDiagnostics } from "./document-diagnostics";

/**
 * Guide → Documents section, driven by SiteData.documents (edited from the
 * admin panel's Documents screen) instead of the old hardcoded
 * content/guide/documents.mdx. Classes mirror mdx-components.tsx's p/ul/li/a
 * so this section still reads as one MDX document.
 */
export function DocumentsList({ documents }: { documents: SiteDocument[] }) {
  if (documents.length === 0) {
    return (
      <p className="mt-4 text-[15.5px] leading-[1.85] text-body">
        Documents will be posted here closer to the conference.
      </p>
    );
  }

  return (
    <>
      <p className="mt-4 text-[15.5px] leading-[1.85] text-body">
        Every document a delegate needs, in one place. Click a title to download.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15.5px] leading-[1.75] text-body">
        {documents.map((doc) => (
          <li key={doc.id} className="pl-1">
            <a
              href={doc.file}
              className="text-brand underline decoration-brand/30 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold/40"
            >
              {doc.title}
            </a>
            {doc.blurb && <> — {doc.blurb}</>}
            {doc.size && <> ({doc.kind ? `${doc.kind}, ` : ""}{doc.size})</>}
          </li>
        ))}
      </ul>
      <DocumentDiagnostics documents={documents} />
    </>
  );
}
