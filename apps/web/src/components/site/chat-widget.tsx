"use client";

/**
 * 안내 챗봇 "Roger" 위젯 — 우하단 플로팅 버튼 + 대화 패널.
 *
 * 무상태: 대화 이력은 이 컴포넌트 state에만 있고, 매 전송 시 전체를
 * POST /api/chat 으로 보낸다 (next.config.ts가 API로 rewrite).
 * 첫 인사는 Claude 호출 없이 하드코딩 (설계안 §opening_message).
 */

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const OPENING: Msg = {
  role: "assistant",
  content:
    "안녕하세요! DAEMUN 안내 챗봇 Roger예요. 실시간 상담이 아니라 자동응답이에요. 동아리 소개, 신청 방법, 활동 일정 등 궁금하신 점을 편하게 물어보세요.",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([OPENING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // 첫 인사는 서버에 보낼 필요 없음
        body: JSON.stringify({ messages: next.filter((m) => m !== OPENING) }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string } | null;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data?.reply ??
            "지금은 답변을 드리기 어려워요. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "연결에 문제가 있어요. 잠시 후 다시 시도해주세요.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "안내 챗봇 닫기" : "안내 챗봇 열기"}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition hover:bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] max-h-[calc(100vh-8rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <header className="border-b border-line px-4 py-3">
            <p className="font-custom text-lg leading-none text-ink">Roger</p>
            <p className="mt-1 text-xs text-muted">DAEMUN 안내 챗봇 · 자동응답</p>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-brand text-white"
                    : "bg-wash text-body",
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-wash px-3 py-2 text-sm text-faint">
                답변을 준비하고 있어요…
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-line px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="궁금한 점을 입력하세요"
              maxLength={4000}
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-3.5 py-2 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              aria-label="보내기"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white transition hover:bg-brand disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
