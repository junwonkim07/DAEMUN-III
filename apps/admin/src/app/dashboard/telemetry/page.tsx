"use client";

import { useState } from "react";
import type { TelemetryRecord } from "@daemun/shared";
import { useTelemetry, type TelemetryFilters } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";

const EVENT_LABELS: Record<TelemetryRecord["type"], string> = {
  document_click: "Document click",
  document_probe: "Document response check",
  document_feedback: "Visitor feedback",
  browser_error: "Browser error",
  server_error: "Server error",
  sentry_error: "Sentry error",
};

const EMPTY_FILTERS: TelemetryFilters = { sessionId: "", type: "" };
const OUTCOME_LABELS: Record<NonNullable<TelemetryRecord["details"]["outcome"]>, string> = {
  success: "Response check passed",
  http_error: "HTTP error",
  network_error: "Network error",
  timeout: "Response check timed out",
  opened: "Visitor reports file opened",
  viewer_error: "Visitor reports viewer error",
  download_failed: "Visitor reports download failed",
  unknown: "Unknown result",
};
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy";

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function EventResult({ event }: { event: TelemetryRecord }) {
  const { status, durationMs, outcome, errorType, message } = event.details;
  const isError = event.type.endsWith("_error") || (status !== undefined && status >= 400);

  return (
    <div className={isError ? "text-[#b23b3b]" : "text-body"}>
      {status !== undefined && <p>HTTP {status}</p>}
      {durationMs !== undefined && <p className="text-faint">{Math.round(durationMs)} ms</p>}
      {outcome && <p className="break-words">{OUTCOME_LABELS[outcome]}</p>}
      {errorType && <p className="break-words">{errorType}</p>}
      {message && <p className="mt-1 max-w-xs break-words">{message}</p>}
      {status === undefined && !outcome && !errorType && !message && (
        <span className="text-faint">Event recorded</span>
      )}
    </div>
  );
}

export default function TelemetryPage() {
  const [draft, setDraft] = useState<TelemetryFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<TelemetryFilters>(EMPTY_FILTERS);
  const { data, isPending, error, isFetching, refetch } = useTelemetry(filters);
  const events = data?.events;
  const sessions = Array.from(new Set(events?.flatMap((event) => event.sessionId ? [event.sessionId] : [])));

  function filterSession(sessionId: string) {
    const next = { ...filters, sessionId };
    setDraft(next);
    setFilters(next);
  }

  return (
    <Screen
      title="Document telemetry"
      subtitle={
        <>
          Recent document activity and errors. Clicks and response checks do not confirm a
          completed download. Browser reports and visitor feedback are client supplied;
          session IDs identify browser sessions, not people.
        </>
      }
      onRefresh={() => refetch()}
      refreshing={isFetching}
      pending={isPending}
      error={error}
    >
      <Card className="mb-5 p-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...draft, sessionId: draft.sessionId.trim() });
          }}
        >
          <label className="min-w-64 flex-1 text-xs font-medium text-muted">
            Browser session ID
            <input
              value={draft.sessionId}
              onChange={(event) => setDraft({ ...draft, sessionId: event.target.value })}
              className={FIELD_CLASS}
              placeholder="All sessions, or paste a session UUID"
              list="telemetry-sessions"
              maxLength={36}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              title="Enter a complete session UUID, or leave blank for all sessions."
            />
            <datalist id="telemetry-sessions">
              {sessions.map((sessionId) => <option key={sessionId} value={sessionId} />)}
            </datalist>
          </label>
          <label className="min-w-56 text-xs font-medium text-muted">
            Event type
            <select
              className={FIELD_CLASS}
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as TelemetryFilters["type"] })}
            >
              <option value="">All event types</option>
              {Object.entries(EVENT_LABELS).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary">Apply filters</Button>
          <Button
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setFilters(EMPTY_FILTERS);
            }}
          >
            Clear
          </Button>
        </form>
      </Card>

      {events && (
        <p className="mb-3 text-xs text-faint" role="status">
          {events.length} events · {sessions.length} browser sessions in these results ·
          Up to 200 matching events, newest received first · Times shown in your local time zone
        </p>
      )}

      {events?.length === 0 && (
        <Card className="p-6 text-sm text-muted">
          {filters.sessionId || filters.type ? "No events match these filters." : "No telemetry events recorded yet."}
        </Card>
      )}

      {!!events?.length && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Recent document telemetry events</caption>
            <thead className="bg-wash/60 text-faint">
              <tr>
                <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">Time</th>
                <th scope="col" className="px-3 py-3 font-medium">Event</th>
                <th scope="col" className="px-3 py-3 font-medium">Document / page</th>
                <th scope="col" className="px-3 py-3 font-medium">Reported result</th>
                <th scope="col" className="px-3 py-3 font-medium">Session</th>
                <th scope="col" className="px-3 py-3 font-medium">Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-3 text-muted">
                    <time dateTime={event.occurredAt}>{formatTime(event.occurredAt)}</time>
                    <p className="mt-1 text-[10px] text-faint">
                      Received {formatTime(event.createdAt)}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-ink">
                    <p className="whitespace-nowrap font-medium">{EVENT_LABELS[event.type]}</p>
                    <p className="mt-1 text-faint">
                      {event.source === "server" ? "Server" : "Browser report"}
                    </p>
                  </td>
                  <td className="min-w-48 max-w-xs px-3 py-3">
                    {event.documentPath && <p className="break-all text-ink">{event.documentPath}</p>}
                    <p className="mt-1 break-all text-faint">Page: {event.pagePath}</p>
                  </td>
                  <td className="min-w-32 px-3 py-3"><EventResult event={event} /></td>
                  <td className="px-3 py-3">
                    {event.sessionId ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (event.sessionId) filterSession(event.sessionId);
                        }}
                        className="max-w-36 break-all text-left font-mono text-navy underline decoration-line underline-offset-2 hover:decoration-navy"
                        title="Show events from this browser session"
                      >
                        {event.sessionId}
                      </button>
                    ) : <span className="text-faint">No browser session</span>}
                  </td>
                  <td className="min-w-48 px-3 py-3 text-muted">
                    <p className="text-faint">Sentry event ID</p>
                    <p className="mt-1 max-w-48 break-all font-mono text-[11px]">
                      {event.sentryEventId || "Not attached"}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-navy">Response and environment</summary>
                      <dl className="mt-2 max-w-sm space-y-2 break-all">
                        <div><dt className="text-faint">Release</dt><dd>{event.release || "Not provided"}</dd></div>
                        <div><dt className="text-faint">Browser / client</dt><dd>{event.userAgent || "Not provided"}</dd></div>
                        <div><dt className="text-faint">Event ID</dt><dd className="font-mono">{event.id}</dd></div>
                      </dl>
                      <pre className="mt-2 max-w-sm whitespace-pre-wrap break-all rounded border border-line bg-wash p-2 text-[11px]">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Screen>
  );
}
