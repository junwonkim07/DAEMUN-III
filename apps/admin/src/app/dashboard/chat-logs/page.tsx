// apps/admin/src/app/dashboard/chat-logs/page.tsx
"use client";

import type { ChatLog } from "@daemun/shared";
import { useChatLogs, useClearChatLogs } from "@/lib/chat-logs";

const OUTCOME_LABEL: Record<ChatLog["outcome"], string> = {
  answered: "답변",
  blocked: "차단",
  error: "오류",
  unavailable: "미설정",
};

export default function ChatLogsPage() {
  const { data, isPending, error, isFetching, refetch } = useChatLogs();
  const clear = useClearChatLogs();

  const noContext = data?.filter((l) => l.outcome === "answered" && l.faqHits === 0).length ?? 0;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">챗봇 로그</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            방문자 질문과 챗봇 답변. <b>근거 없음</b>이 많은 질문은 FAQ로 추가하면
            답변 품질이 올라갑니다. 90일이 지난 로그는 자동 삭제됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {isFetching ? "새로고침 중…" : "새로고침"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("로그를 전부 삭제할까요? 되돌릴 수 없습니다."))
                clear.mutate();
            }}
            disabled={clear.isPending || !data?.length}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            전체 삭제
          </button>
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="mt-4 flex gap-2 text-xs">
          <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 font-medium text-neutral-600">
            전체 {data.length}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            근거 없음 {noContext}
          </span>
        </div>
      )}

      <div className="mt-6">
        {isPending && <p className="text-sm text-neutral-500">불러오는 중...</p>}
        {error && (
          <p className="text-sm text-red-600">불러오지 못했습니다: {error.message}</p>
        )}
        {data && data.length === 0 && (
          <p className="text-sm text-neutral-500">아직 로그가 없습니다.</p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">시각</th>
                  <th className="px-3 py-2 font-medium">질문</th>
                  <th className="px-3 py-2 font-medium">답변</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">근거</th>
                  <th className="whitespace-nowrap px-3 py-2 font-medium">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-400">
                      {new Date(log.createdAt).toLocaleString("ko-KR", {
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
                          근거 없음
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
