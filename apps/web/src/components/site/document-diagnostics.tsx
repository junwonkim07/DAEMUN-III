"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import type { SiteDocument } from "@daemun/shared";
import { diagnosticSession, probeDocument, saveTelemetry, telemetryEvent } from "@/lib/telemetry";

export function DocumentDiagnostics({ documents }: { documents: SiteDocument[] }) {
  const [selected, setSelected] = useState(documents[0]?.id ?? "");
  const [outcome, setOutcome] = useState<"viewer_error" | "download_failed" | "opened">("viewer_error");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const doc = documents.find((entry) => entry.id === selected);

  async function checkLink() {
    if (!doc) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await probeDocument(doc.file);
      setReference(diagnosticSession());
      const status = result.event.details.status;
      const reachable = result.event.details.outcome === "success";
      setMessage(`${reachable ? "The file server responded successfully" : "The file check did not succeed"}${status ? ` (HTTP ${status})` : ""}. ${result.saved ? "Diagnostic saved." : "The diagnostic could not be saved; please share this result with the Secretariat."} This check does not confirm that Microsoft’s viewer can open the file.`);
    } catch {
      setMessage("This link cannot be checked here. Please contact the Secretariat with the document name.");
    } finally { setBusy(false); }
  }

  async function report() {
    if (!doc) return;
    setBusy(true);
    setMessage("");
    try {
      const sentryEventId = process.env.NEXT_PUBLIC_SENTRY_DSN && outcome !== "opened"
        ? Sentry.captureMessage(`Document reported: ${outcome}`, {
            level: "warning",
            tags: { diagnostic_session: diagnosticSession(), document_id: doc.id },
          }) : undefined;
      const saved = await saveTelemetry(telemetryEvent("document_feedback", { outcome }, doc.file, sentryEventId));
      setReference(diagnosticSession());
      setMessage(saved
        ? "Thank you. Your report was saved. Please share the reference below with the Secretariat, along with the error screenshot and the address shown by your browser."
        : "Your report could not be saved. Please contact the Secretariat with the document name and error screenshot.");
    } catch { setMessage("Your report could not be saved. Please contact the Secretariat."); }
    finally { setBusy(false); }
  }

  if (!documents.length) return null;
  return (
    <details className="mt-7 rounded-xl border border-line bg-white/60 p-4 text-[14px] text-body">
      <summary className="cursor-pointer font-medium text-ink">Having trouble opening a document?</summary>
      <p className="mt-3 leading-relaxed">Check the file link or tell us what happened. We record the selected document, browser information and time to help troubleshoot. We cannot see the Microsoft viewer page or whether a download finished.</p>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">Document
          <select value={selected} onChange={(event) => setSelected(event.target.value)} className="min-h-11 rounded-lg border border-line bg-white px-3">
            {documents.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => void checkLink()} className="min-h-11 rounded-lg border border-line px-4 text-ink disabled:opacity-50">{busy ? "Please wait…" : "Check document link"}</button>
        <label className="grid gap-1">What happened?
          <select value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)} className="min-h-11 rounded-lg border border-line bg-white px-3">
            <option value="viewer_error">Microsoft’s viewer showed an error</option>
            <option value="download_failed">The file did not download</option>
            <option value="opened">The document opened successfully</option>
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => void report()} className="min-h-11 rounded-lg bg-navy px-4 text-white disabled:opacity-50">Send report</button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 leading-relaxed">{message}</p>
      {reference && <p className="mt-2 break-all text-xs">Reference: <span className="font-mono select-all">{reference}</span></p>}
    </details>
  );
}
