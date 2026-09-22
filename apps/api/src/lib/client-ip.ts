import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

/**
 * 레이트 리미팅용 클라이언트 IP.
 *
 * 프록시는 클라이언트가 보낸 X-Forwarded-For를 버리지 않고 실제 원격 주소를
 * **오른쪽에 덧붙인다**. 그래서 **XFF에서 사설 IP가 아닌 가장 오른쪽 항목**을
 * 실제 클라이언트로 본다 — 클라이언트가 가짜 공인 IP를 끼워 넣어도 그건 왼쪽에
 * 남아 무시된다. 홉이 몇 개든(엣지 → 함수, 또는 로컬의 web Next rewrite → api)
 * 같은 규칙이 성립한다.
 *
 * 서버리스에서는 getConnInfo가 node-server 어댑터 전용이라 던진다 → peer가
 * "unknown"이 되고, isInternal이 그걸 내부로 쳐서 XFF 경로로 간다. 장수
 * 프로세스(로컬 `pnpm dev:api`)에서는 진짜 peer가 잡히고, 직접 연결이면 XFF를
 * 아예 믿지 않는다.
 *
 * X-Real-IP / CF-Connecting-IP 는 이 스택에서 아무도 덮어쓰지 않아 완전히
 * 클라이언트가 조작 가능하므로 쓰지 않는다.
 */

function isInternal(ip: string): boolean {
  const v = ip.replace(/^::ffff:/i, "");
  return (
    v === "127.0.0.1" ||
    v === "::1" ||
    v.startsWith("10.") ||
    v.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(v) ||
    /^169\.254\./.test(v) ||
    /^(fe80|f[cd][0-9a-f]{2}):/i.test(v) ||
    v === "unknown" ||
    v === ""
  );
}

export function clientIp(c: Context): string {
  let peer = "unknown";
  try {
    peer = getConnInfo(c).remote.address ?? "unknown";
  } catch {
    /* getConnInfo은 node 어댑터에서만 동작 */
  }

  // 프록시 뒤가 아니라 직접 연결이면 XFF를 믿지 않는다.
  if (!isInternal(peer)) return peer;

  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!isInternal(parts[i]!)) return parts[i]!;
    }
  }
  return peer;
}
