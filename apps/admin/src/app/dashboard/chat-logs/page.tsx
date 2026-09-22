// apps/admin/src/app/dashboard/chat-logs/page.tsx
"use client";

import type { ChatLog } from "@daemun/shared";
import { useChatLogs, useClearChatLogs } from "@/lib/chat-logs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";

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
    <Screen
      title="Chat logs"
      subtitle={
        <>
          Visitor questions and the bot&apos;s replies. The bot always sees the whole public
          site; <b>no FAQ</b> marks questions that matched none of the secretariat-written FAQs
          — worth a look if the answer was thin. Logs older than 90 days are deleted
          automatically.
        </>
      }
      onRefresh={() => refetch()}
      refreshing={isFetching}
      pending={isPending}
      error={error}
      headerExtra={
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm("Delete every log? This cannot be undone."))
              clear.mutate();
          }}
          disabled={clear.isPending || !data?.length}
        >
          Delete all
        </Button>
      }
    >
      {data && data.length > 0 && (
        <div className="mb-4 flex gap-2 text-xs">
          <span className="rounded-full border border-line bg-white px-2.5 py-1 font-medium text-body">
            {data.length} total
          </span>
          <span className="rounded-full border border-gold-soft bg-gold-soft/15 px-2.5 py-1 font-medium text-[#8a6a2c]">
            {noContext} with no source
          </span>
        </div>
      )}

      {data && data.length === 0 && <p className="text-sm text-faint">No logs yet.</p>}

      {data && data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-wash/60 text-left text-xs text-faint">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Question</th>
                <th className="px-3 py-2 font-medium">Answer</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">Source</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-faint">
                    {new Date(log.createdAt).toLocaleString("en-GB", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 text-ink">{log.question}</td>
                  <td className="max-w-md px-3 py-2 text-muted">{log.answer}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {log.faqHits === 0 ? (
                      <span className="rounded bg-gold-soft/20 px-1.5 py-0.5 text-xs text-[#8a6a2c]">
                        No FAQ
                      </span>
                    ) : (
                      <span className="text-xs text-faint">FAQ {log.faqHits}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                    {OUTCOME_LABEL[log.outcome]}
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
