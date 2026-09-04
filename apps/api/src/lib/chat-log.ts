import { randomUUID } from "node:crypto";
import { lt } from "drizzle-orm";
import type { ChatOutcome } from "@daemun/shared";
import { chatLogs } from "@daemun/db";
import { db } from "../db";

/**
 * 챗봇 질문-답변을 한 줄 남긴다 (설계안 §3-3 로깅/모니터링). 운영진이
 * 관리자 화면에서 보고 오답 패턴을 찾아 FAQ를 보강하는 용도.
 *
 * Fire-and-forget: 로그 저장이 실패해도 챗봇 응답은 영향받지 않는다.
 * 대화 이력 전체가 아니라 마지막 질문·답변만 저장한다.
 *
 * 개인정보: 방문자가 자유 입력한 질문이 그대로 저장될 수 있다. 90일이
 * 지난 로그는 새 로그를 쓸 때 함께 지운다.
 */

const RETENTION_DAYS = 90;
const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 보관 정리는 최대 1시간에 한 번
let lastSweep = 0;

export function logChat(entry: {
  question: string;
  answer: string;
  outcome: ChatOutcome;
  faqHits: number;
}): void {
  void (async () => {
    try {
      await db.insert(chatLogs).values({
        id: randomUUID(),
        question: entry.question.slice(0, 4000),
        answer: entry.answer.slice(0, 4000),
        outcome: entry.outcome,
        faqHits: entry.faqHits,
      });

      const now = Date.now();
      if (now - lastSweep > SWEEP_INTERVAL_MS) {
        lastSweep = now;
        const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000);
        await db.delete(chatLogs).where(lt(chatLogs.createdAt, cutoff));
      }
    } catch (err) {
      console.warn("[chat-log] insert failed:", (err as Error).message);
    }
  })();
}
