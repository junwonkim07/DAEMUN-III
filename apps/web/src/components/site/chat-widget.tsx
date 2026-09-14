"use client";

/**
 * 안내 챗봇 "Roger" 위젯 — 우하단 플로팅 버튼이 gooey(점성) 효과로 늘어나
 * 대화 패널이 되는 UI. 대화 UI 자체는 AI Elements(conversation / message /
 * prompt-input / loader)로 구성한다.
 *
 * 레이어가 둘이다:
 *  - 필터 레이어(SVG gooey filter): 남색 blob(패널 모양)과 버튼 원. 색 덩어리만
 *    있어서 blur+alpha threshold를 먹여도 깨질 글자가 없다.
 *  - 콘텐츠 레이어(필터 없음): 실제 헤더·메시지·입력창. blob이 다 늘어난 뒤
 *    페이드인하고, 닫을 때는 먼저 사라진다. 글자가 blur 되지 않는 이유.
 *
 * 무상태: 대화 이력은 이 컴포넌트 state에만 있고, 전송 시 최근 MAX_HISTORY턴을
 * POST /api/chat 으로 보낸다 (next.config.ts가 API로 rewrite). 첫 인사는
 * 서버 호출 없이 하드코딩 (설계안 §opening_message).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Nanum_Gothic } from "next/font/google";
import { MessageCircle, X } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

/** 대화창 전용 본문 서체 — 사이트 본문(세리프)과 달리 채팅은 고딕이 읽기 편하다. */
const nanumGothic = Nanum_Gothic({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

/**
 * `local`은 이 컴포넌트가 만든 말풍선(첫 인사, 오류 안내)이라는 표시다.
 * 서버로 다시 보내지 않는다 — 모델이 자기 이전 답변으로 오인하면 안 된다.
 */
type Msg = {
  role: "user" | "assistant";
  content: string;
  local?: boolean;
  /** 아직 토큰이 들어오는 중 — 끝에 커서를 붙여 보여준다. */
  streaming?: boolean;
};

/** 서버(chatRequestSchema)는 40개까지 받고 10턴만 쓴다 — 넉넉히 20으로 자른다. */
const MAX_HISTORY = 20;
/** 서버 본문 상한 64KB(라우트의 bodyLimit)보다 여유 있게 — 넘으면 오래된 것부터 버린다. */
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

/* ---------- 크기 ---------- */

/** 플로팅 버튼 지름(px). Tailwind h-14. */
const FAB = 56;
/** 버튼 위쪽으로 패널이 시작하는 간격(px) = 버튼 + 16. */
const PANEL_LIFT = FAB + 16;
const PANEL_W = 352; // 22rem
const PANEL_H = 512; // 32rem
const VIEWPORT_GUTTER_X = 40; // 화면 양옆 여백 합
const VIEWPORT_GUTTER_Y = 128;

function usePanelSize() {
  const [size, setSize] = useState({ w: PANEL_W, h: PANEL_H });
  useEffect(() => {
    const measure = () =>
      setSize({
        w: Math.min(PANEL_W, window.innerWidth - VIEWPORT_GUTTER_X),
        h: Math.min(PANEL_H, window.innerHeight - VIEWPORT_GUTTER_Y),
      });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return size;
}

/* ---------- 모션 ---------- */

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

/** 가장자리를 녹여 붙이는 gooey 필터 — blur 후 alpha를 급경사로 세운다. */
function GooeyFilter() {
  return (
    <svg aria-hidden="true" className="absolute h-0 w-0" focusable="false">
      <defs>
        <filter id="chat-gooey">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([OPENING]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const panel = usePanelSize();
  const reduceMotion = useReducedMotion();
  const fabRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    // blob이 늘어난 뒤 콘텐츠가 뜨므로 포커스도 그때 준다.
    const t = window.setTimeout(() => textareaRef.current?.focus(), reduceMotion ? 0 : 350);
    return () => window.clearTimeout(t);
  }, [open, reduceMotion]);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  function reset() {
    setMessages([OPENING]);
    setDraft("");
    textareaRef.current?.focus();
  }

  async function send({ text: raw }: PromptInputMessage) {
    const text = raw.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setDraft("");
    setLoading(true);

    // 첫 인사·오류 안내(local)는 빼고, 개수·크기 한도 안쪽으로 잘라 보낸다.
    const payload = trimForRequest(next);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      // 성공하면 SSE 스트림, 실패하면 JSON — content-type으로 가른다.
      // 서버가 스트림으로 준 것만 모델의 실제 답변으로 취급한다. 우리 쪽 안내
      // 문구나 오류 응답(429·502·503의 reply 포함)은 local이라 다음 요청에 안 실린다.
      const streamed =
        res.ok && (res.headers.get("content-type") ?? "").includes("text/event-stream") && res.body;

      if (!streamed) {
        const data = (await res.json().catch(() => null)) as { reply?: string } | null;
        setMessages((m) => [
          ...m,
          {
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
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let opened = false;
      let buf = "";
      let ended = false;
      for (; !ended; ) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // `data: <JSON 문자열>` 줄만 꺼낸다. 청크 경계에서 잘린 줄은 남겨 둔다.
        let nl = buf.indexOf("\n");
        const pieces: string[] = [];
        while (nl !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          nl = buf.indexOf("\n");
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            ended = true;
            break;
          }
          try {
            const text = JSON.parse(payload) as unknown;
            if (typeof text === "string" && text) pieces.push(text);
          } catch {
            // 규격 밖 줄 — 무시한다.
          }
        }

        const piece = pieces.join("");
        if (!piece) continue;
        if (!opened) {
          // 첫 조각이 왔을 때 비로소 말풍선을 만든다 — 그 전까지는 로딩 표시.
          opened = true;
          setLoading(false);
          setMessages((m) => [...m, { role: "assistant", content: piece, streaming: true }]);
          continue;
        }
        setMessages((m) =>
          m.map((msg, i) =>
            i === m.length - 1 ? { ...msg, content: msg.content + piece } : msg,
          ),
        );
      }
      setMessages((m) =>
        m.map((msg, i) => (i === m.length - 1 && msg.streaming ? { ...msg, streaming: false } : msg)),
      );
      if (!opened) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            local: true,
            content: "답변을 받지 못했어요. 잠시 후 다시 시도해주세요.",
          },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", local: true, content: NETWORK_ERROR }]);
    } finally {
      setLoading(false);
    }
  }

  const spring = reduceMotion ? { duration: 0 } : SPRING;
  const blob = open
    ? { width: panel.w, height: panel.h, borderRadius: 16, bottom: PANEL_LIFT }
    : { width: FAB, height: FAB, borderRadius: FAB / 2, bottom: 0 };

  return (
    <div
      data-chat-widget
      className={cn("fixed bottom-5 right-5 z-[60]", nanumGothic.className)}
      style={{ width: panel.w, height: panel.h + PANEL_LIFT }}
    >
      <GooeyFilter />

      {/* 필터 레이어 — 색 덩어리만. 글자는 여기 두지 않는다. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ filter: "url(#chat-gooey)" }}
      >
        <motion.div
          className="absolute right-0 bg-navy"
          initial={false}
          animate={blob}
          transition={{
            ...spring,
            // 먼저 위로 뽑히고(bottom) 그 다음 넓어지도록 살짝 시차를 둔다.
            width: { ...spring, delay: reduceMotion ? 0 : 0.1 },
            height: { ...spring, delay: reduceMotion ? 0 : 0.1 },
            borderRadius: { ...spring, delay: reduceMotion ? 0 : 0.1 },
          }}
        />
        <div className="absolute bottom-0 right-0 size-14 rounded-full bg-navy" />
      </div>

      {/* 콘텐츠 레이어 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            role="dialog"
            aria-label="DAEMUN 안내 챗봇"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: reduceMotion ? 0 : 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            className="absolute right-0 flex flex-col overflow-hidden rounded-2xl text-ink"
            style={{ width: panel.w, height: panel.h, bottom: PANEL_LIFT }}
          >
            <header className="flex shrink-0 items-start justify-between gap-2 px-4 pb-3 pt-3.5 text-white">
              <div>
                <p className="text-base font-bold leading-none tracking-tight">Roger</p>
                <p className="mt-1 text-xs text-white/70">DAEMUN 안내 챗봇 · 자동응답</p>
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={loading || messages.length <= 1}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                새 대화
              </button>
            </header>

            <div className="mx-1 mb-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white">
              {/* 홈의 <ReactLenis root>가 휠 스크롤을 가로채므로 이 목록은 제외시킨다. */}
              <Conversation
                data-lenis-prevent
                aria-live="polite"
                className="min-h-0 flex-1"
              >
                <ConversationContent className="gap-3 px-3 py-3">
                  {messages.map((m, i) => (
                    <Message key={i} from={m.role} className="max-w-[88%]">
                      <MessageContent
                        className={cn(
                          "text-[13.5px] leading-relaxed [&_a]:break-all [&_a]:underline [&_a]:underline-offset-2",
                          m.role === "user"
                            ? "group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-brand group-[.is-user]:px-3.5 group-[.is-user]:py-2 group-[.is-user]:text-white"
                            : "rounded-2xl rounded-bl-md bg-wash px-3.5 py-2 text-body",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <MessageResponse>
                            {m.streaming ? `${m.content}\u2588` : m.content}
                          </MessageResponse>
                        ) : (
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        )}
                      </MessageContent>
                    </Message>
                  ))}
                  {loading && (
                    <Message from="assistant" className="max-w-[88%]">
                      <MessageContent className="flex-row items-center px-1 py-1.5">
                        <span className="sr-only">답변을 준비하고 있어요</span>
                        <span
                          aria-hidden="true"
                          className="size-2.5 animate-chat-think rounded-full bg-ink"
                        />
                      </MessageContent>
                    </Message>
                  )}
                </ConversationContent>
                <ConversationScrollButton className="bottom-2 size-8 border-line bg-white shadow-md" />
              </Conversation>

              <div className="shrink-0 border-t border-line px-2 py-2">
                <PromptInput
                  onSubmit={send}
                  className="[&>[data-slot=input-group]]:rounded-xl [&>[data-slot=input-group]]:border-line [&>[data-slot=input-group]]:shadow-none [&>[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:border-brand [&>[data-slot=input-group]]:has-[[data-slot=input-group-control]:focus-visible]:ring-brand/20"
                >
                  <PromptInputBody>
                    <PromptInputTextarea
                      ref={textareaRef}
                      placeholder="궁금한 점을 입력하세요"
                      maxLength={4000}
                      rows={1}
                      onChange={(e) => setDraft(e.currentTarget.value)}
                      className="max-h-32 min-h-10 px-3 py-2.5 text-[13.5px] placeholder:text-faint"
                    />
                  </PromptInputBody>
                  <PromptInputFooter className="justify-end px-1.5 pb-1.5 pt-0">
                    <PromptInputSubmit
                      aria-label="보내기"
                      disabled={loading || !draft.trim()}
                      status={loading ? "submitted" : undefined}
                      className="rounded-full bg-navy text-white hover:bg-brand"
                    />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 플로팅 버튼 — 색은 필터 레이어의 원이 담당하고, 여기는 아이콘과 포커스만. */}
      <button
        ref={fabRef}
        type="button"
        aria-label={open ? "안내 챗봇 닫기" : "안내 챗봇 열기"}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="absolute bottom-0 right-0 flex size-14 items-center justify-center rounded-full text-white transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <motion.span
          key={open ? "x" : "chat"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex"
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </motion.span>
      </button>
    </div>
  );
}
