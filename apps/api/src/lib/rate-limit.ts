/**
 * 아주 단순한 고정 윈도우 레이트 리미터 (프로세스 메모리). API가 단일
 * 인스턴스(docker compose `api` 서비스 하나)라 이걸로 충분하다. 여러
 * 인스턴스로 늘리면 Redis 등으로 교체.
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
