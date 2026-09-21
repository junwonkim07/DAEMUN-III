"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { TextRoll } from "@/components/ui/skiper-ui/skiper58";
import { downloadResolution, resolutionDocumentInfo } from "@/lib/resolution-document";

export function ResolutionDownload({ url, originalName }: { url: string; originalName?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const { filename, label } = resolutionDocumentInfo(url, originalName);

  async function download() {
    setBusy(true);
    setError(false);
    try {
      await downloadResolution(url, filename);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        aria-label={`Download ${filename}`}
        aria-busy={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-brand/35 px-4 text-[12px] font-roman uppercase tracking-widest text-black/55 transition-colors hover:bg-brand hover:text-white disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        <TextRoll className="leading-none">{label}</TextRoll>
      </button>
      {error && <span role="alert" className="text-xs text-red-700">Download failed. Please try again.</span>}
    </div>
  );
}
