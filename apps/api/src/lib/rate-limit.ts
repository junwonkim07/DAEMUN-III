/**
 * 아주 단순한 고정 윈도우 레이트 리미터 (프로세스 메모리).
 *
 * **서버리스에서는 인스턴스마다 따로 센다.** 단일 프로세스였던 VPS와 달리
 * Vercel은 인스턴스를 여러 개 띄우므로, 유일한 사용처인 `POST /api/public/chat`
 * (분당 10회/IP)의 실제 상한은 "10 × 동시 인스턴스 수"다. 한 클라이언트의 폭주
 * 루프를 끊는 데는 그대로 쓸모 있지만 전역 상한은 아니다.
 *
 * 그래도 두는 이유: 이 엔드포인트의 진짜 비용 방어선은 Gemini 무료 티어 쿼터
 * (~15 RPM / ~1,000 req/day)이고, 그 아래에서 한 명이 API를 갈아 마시는 것만
 * 막으면 된다. 진짜 전역 상한이 필요해지면 공유 저장소(Upstash Redis 등)로
 * 바꿀 것 — 이 모듈의 인터페이스는 그대로 두고 구현만 교체하면 된다.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

let sweepTimer: NodeJS.Timeout | null = null;
function scheduleSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
    if (buckets.size === 0 && sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  }, 60_000);
  // 스윕 타이머 때문에 프로세스가 안 죽는 일이 없도록
  sweepTimer.unref?.();
}

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/** `key`에 대해 `windowMs` 동안 `limit`회까지 허용. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    scheduleSweep();
    return { ok: true, retryAfterSec: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** 테스트용 — 전체 상태 초기화. */
export function _resetRateLimits() {
  buckets.clear();
}
