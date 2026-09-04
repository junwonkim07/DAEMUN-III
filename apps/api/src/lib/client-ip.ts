import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

/**
 * 레이트 리미팅용 클라이언트 IP.
 *
 * 배포 경로는 Caddy → web(Next rewrite) → api 다. Caddy는 trusted_proxies가
 * 설정돼 있지 않으면 클라이언트가 보낸 X-Forwarded-For를 무시하고 실제 원격
 * 주소를 붙인다. 그 뒤 내부 홉(Next, Docker 네트워크)이 사설 IP를 더 붙일 수
 * 있으므로, **XFF에서 사설 IP가 아닌 가장 오른쪽 항목**을 실제 클라이언트로
 * 본다. 클라이언트가 앞에 가짜 공인 IP를 끼워 넣어도 그건 왼쪽에 있어 무시된다.
 *
 * X-Real-IP / CF-Connecting-IP 는 이 스택에서 아무도 설정하지 않아 완전히
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

  // 프록시(Caddy/컨테이너 네트워크) 뒤가 아니라 직접 연결이면 XFF를 믿지 않는다.
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
