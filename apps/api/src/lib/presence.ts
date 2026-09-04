/**
 * "Who is on the site right now" — in-memory heartbeat registry.
 *
 * The public site posts `{ id }` (a per-tab random id) every ~45 s while the
 * page is visible. An id counts as online until PRESENCE_TTL_MS pass without a
 * beat. Nothing is persisted and no IP or account is recorded; the admin
 * overview only reads the count.
 */
const PRESENCE_TTL_MS = 2 * 60 * 1000;
const MAX_ENTRIES = 50_000; // hard cap so a flood of random ids cannot grow memory

const lastSeen = new Map<string, number>();

export function heartbeat(id: string, now = Date.now()) {
  if (!lastSeen.has(id) && lastSeen.size >= MAX_ENTRIES) prune(now);
  if (!lastSeen.has(id) && lastSeen.size >= MAX_ENTRIES) return; // still full: drop
  lastSeen.set(id, now);
}

export function onlineCount(now = Date.now()) {
  prune(now);
  return lastSeen.size;
}

function prune(now: number) {
  for (const [id, t] of lastSeen) {
    if (now - t > PRESENCE_TTL_MS) lastSeen.delete(id);
  }
}
