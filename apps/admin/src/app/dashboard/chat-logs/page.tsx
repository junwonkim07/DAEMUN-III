// apps/admin/src/app/dashboard/chat-logs/page.tsx
"use client";

import type { ChatLog } from "@daemun/shared";
import { useChatLogs, useClearChatLogs } from "@/lib/chat-logs";

const OUTCOME_LABEL: Record<ChatLog["outcome"], string> = {
  answered: "Answered",
  blocked: "Blocked",
  error: "Error",
  unavailable: "Not configured",
};

export default function ChatLogsPage() {
  const { data, isPending, error, isFetching, refetch } = useChatLogs();
  const clear = useClearChatLogs();

  const noContext = data?.filter((l) => l.outcome === "answered" && l.faqHits === 0).length ?? 0;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Chat logs</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Visitor questions and the bot&apos;s replies. Questions marked <b>no
            source</b> are the ones to turn into FAQs — the bot answered them without
            anything to go on. Logs older than 90 days are deleted automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete every log? This cannot be undone."))
                clear.mutate();
            }}
            disabled={clear.isPending || !data?.length}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete all
          </button>
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="mt-4 flex gap-2 text-xs">
          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 font-medium text-neutral-600">
            {data.length} total
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            {noContext} with no source
          </span>
        </div>
      )}

      <div className="mt-6">
        {isPending && <p className="text-sm text-neutral-500">Loading...</p>}
        {error && (
          <p className="text-sm text-red-600">Failed to load: {error.message}</p>
        )}
        {data && data.length === 0 && (
          <p className="text-sm text-neutral-500">No logs yet.</p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Answer</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Source</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                      {new Date(log.createdAt).toLocaleString("en-GB", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-neutral-800">{log.question}</td>
                    <td className="max-w-md px-3 py-2 text-neutral-500">{log.answer}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {log.faqHits === 0 ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                          No source
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">FAQ {log.faqHits}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">
                      {OUTCOME_LABEL[log.outcome]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
