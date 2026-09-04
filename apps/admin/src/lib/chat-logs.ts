// 챗봇 질문-답변 로그( /api/admin/chat-logs )용 react-query 훅.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatLog } from "@daemun/shared";
import { adminFetch } from "./api";

export const CHAT_LOGS_KEY = ["admin", "chat-logs"] as const;

/** 최근 로그 (최신순). API가 최대 200건 돌려준다. */
export function useChatLogs() {
  return useQuery({
    queryKey: CHAT_LOGS_KEY,
    queryFn: () => adminFetch<ChatLog[]>("/chat-logs"),
  });
}

/** 로그 전체 삭제 (개인정보 정리용). */
export function useClearChatLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminFetch<{ ok: true }>("/chat-logs", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAT_LOGS_KEY }),
  });
}
