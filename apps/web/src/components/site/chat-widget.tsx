"use client";

/**
 * 안내 챗봇 "Roger" 위젯 — 우하단 플로팅 버튼 + 대화 패널.
 *
 * 무상태: 대화 이력은 이 컴포넌트 state에만 있고, 전송 시 최근 MAX_HISTORY턴을
 * POST /api/chat 으로 보낸다 (next.config.ts가 API로 rewrite). 첫 인사는
 * 서버 호출 없이 하드코딩 (설계안 §opening_message).
 */

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `local`은 이 컴포넌트가 만든 말풍선(첫 인사, 오류 안내)이라는 표시다.
 * 서버로 다시 보내지 않는다 — 모델이 자기 이전 답변으로 오인하면 안 된다.
 */
type Msg = { role: "user" | "assistant"; content: string; local?: boolean };

/** 서버(chatRequestSchema)는 40개까지 받고 10턴만 쓴다 — 넉넉히 20으로 자른다. */
const MAX_HISTORY = 20;
/** 서버·Caddy 본문 상한 64KB보다 여유 있게 — 넘으면 오래된 것부터 버린다. */
const MAX_BODY_BYTES = 48 * 1024;

/** 보낼 이력: local 제외, 최근 MAX_HISTORY개, 그리고 크기 한도 안쪽까지. */
function trimForRequest(messages: Msg[]): Msg[] {
  const sendable = messages.filter((m) => !m.local).slice(-MAX_HISTORY);
  const out: Msg[] = [];
  let bytes = 0;
  for (let i = sendable.length - 1; i >= 0; i--) {
    const m = sendable[i]!;
    const size = new TextEncoder().encode(m.content).length + 40; // JSON 오버헤드
    if (out.length > 0 && bytes + size > MAX_BODY_BYTES) break;
    out.unshift({ role: m.role, content: m.content });
    bytes += size;
  }
  return out;
}

const OPENING: Msg = {
  role: "assistant",
  local: true,
  content:
    "안녕하세요! DAEMUN 안내 챗봇 Roger예요. 실시간 상담이 아니라 자동응답이에요. 동아리 소개, 신청 방법, 활동 일정 등 궁금하신 점을 편하게 물어보세요.",
};

const NETWORK_ERROR = "연결에 문제가 있어요. 잠시 후 다시 시도해주세요.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([OPENING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    fabRef.current?.focus();
  }

  function reset() {
    setMessages([OPENING]);
    setInput("");
    inputRef.current?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // 첫 인사·오류 안내(local)는 빼고, 개수·크기 한도 안쪽으로 잘라 보낸다.
    const payload = trimForRequest(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      const data = (await res.json().catch(() => null)) as { reply?: string } | null;
      // 서버가 준 answer만 모델의 실제 답변으로 취급한다. 우리 쪽 안내 문구나
      // 오류 응답(429·502·503의 reply 포함)은 local이라 다음 요청에 안 실린다.
      const served = res.ok && typeof data?.reply === "string";
      setMessages((m) => [
        ...m,
        served
          ? { role: "assistant", content: data!.reply as string }
          : {
              role: "assistant",
              local: true,
              content:
                typeof data?.reply === "string"
                  ? data.reply
                  : res.ok
                    ? "답변을 받지 못했어요. 잠시 후 다시 시도해주세요."
                    : NETWORK_ERROR,
            },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", local: true, content: NETWORK_ERROR }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        aria-label={open ? "안내 챗봇 닫기" : "안내 챗봇 열기"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition hover:bg-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="DAEMUN 안내 챗봇"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed bottom-24 right-5 z-[60] flex h-[32rem] max-h-[calc(100vh-8rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
        >
          <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <p className="font-custom text-lg leading-none text-ink">Roger</p>
              <p className="mt-1 text-xs text-muted">DAEMUN 안내 챗봇 · 자동응답</p>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={loading || messages.length <= 1}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-muted hover:bg-wash hover:text-ink disabled:opacity-40"
            >
              새 대화
            </button>
          </header>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            // 홈의 <ReactLenis root>가 휠 스크롤을 가로채므로 이 목록은 제외시킨다.
            data-lenis-prevent
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed",
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
                // 한글 등 IME 조합 중 Enter는 글자 확정용이므로 전송하지 않는다.
                // isComposing은 WebKit에서 놓칠 때가 있어 keyCode 229도 함께 본다.
                if (e.key !== "Enter" || e.shiftKey) return;
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                e.preventDefault();
                void send();
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
