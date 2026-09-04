"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "개요", exact: true },
  { href: "/dashboard/resolutions", label: "결의안 현황판" },
  { href: "/dashboard/secretariat", label: "사무국" },
  { href: "/dashboard/conference", label: "회의 정보" },
  { href: "/dashboard/committees", label: "위원회 · 의제" },
  { href: "/dashboard/schedule", label: "일정" },
  { href: "/dashboard/documents", label: "문서" },
  { href: "/dashboard/accounts", label: "계정" },
  { href: "/dashboard/faqs", label: "FAQ" },
  { href: "/dashboard/chat-logs", label: "챗봇 로그" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { data: session, isPending, error } = useSession();

  useEffect(() => {
    // 쿠키는 있으나 세션이 서버에서 만료/밴된 경우의 2차 방어선.
    // 네트워크/서버 오류(error)는 세션 부재가 아니므로 리다이렉트하지 않고
    // 아래에서 메시지를 보여준다.
    if (!isPending && !error && !session) router.replace("/login");
  }, [isPending, error, session, router]);

  async function logout() {
    // better-auth 클라이언트는 throw 대신 { error }를 돌려준다 — 실패하면
    // 쿠키가 남아 있으므로 다음 사람이 이 세션을 이어받지 않게 여기서 멈춘다.
    const { error: signOutError } = await signOut();
    if (signOutError) {
      window.alert(`로그아웃 실패: ${signOutError.message ?? "다시 시도하세요."}`);
      return;
    }
    qc.clear(); // 다음 로그인 사용자에게 이전 데이터가 보이지 않도록
    router.push("/login");
  }

  if (isPending) {
    return <p className="p-6 text-sm text-neutral-500">불러오는 중...</p>;
  }
  if (error) {
    return (
      <p className="p-6 text-sm text-red-600">
        세션을 확인할 수 없습니다: {error.message}
      </p>
    );
  }
  if (!session) return null;

  // API의 requireAdmin은 role === "admin"만 통과시킨다 (참가자 계정은 403).
  // 셸을 통째로 보여주고 모든 요청이 403으로 실패하게 두지 않는다.
  if (session.user.role !== "admin") {
    return (
      <div className="p-6 text-sm">
        <p className="font-medium text-red-600">관리자 권한이 없는 계정입니다.</p>
        <p className="mt-1 text-neutral-600">
          {session.user.email} (role: {session.user.role ?? "없음"})
        </p>
        <button
          onClick={logout}
          className="mt-4 rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
        >
          다른 계정으로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-semibold">DAEMUN III</p>
          <p className="text-xs text-neutral-500">관리자 패널</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-200 p-3">
          <p className="truncate px-1 pb-2 text-xs text-neutral-500" title={session.user.email}>
            {session.user.email}
          </p>
          <button
            onClick={logout}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
