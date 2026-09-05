"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/resolutions", label: "Resolutions" },
  { href: "/dashboard/secretariat", label: "Secretariat" },
  { href: "/dashboard/conference", label: "Conference" },
  { href: "/dashboard/committees", label: "Committees & Topics" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/teams", label: "Teams" },
  { href: "/dashboard/faqs", label: "FAQ" },
  { href: "/dashboard/chat-logs", label: "Chat logs" },
  { href: "/dashboard/preview", label: "Preview" },
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
      window.alert(`Sign-out failed: ${signOutError.message ?? "Please try again."}`);
      return;
    }
    qc.clear(); // 다음 로그인 사용자에게 이전 데이터가 보이지 않도록
    router.push("/login");
  }

  if (isPending) {
    return <p className="p-6 text-sm text-muted">Loading…</p>;
  }
  if (error) {
    return (
      <p className="p-6 text-sm text-[#b23b3b]">
        Could not verify session: {error.message}
      </p>
    );
  }
  if (!session) return null;

  // API의 requireAdmin은 role === "admin"만 통과시킨다 (참가자 계정은 403).
  // 셸을 통째로 보여주고 모든 요청이 403으로 실패하게 두지 않는다.
  if (session.user.role !== "admin") {
    return (
      <div className="p-6 text-sm">
        <p className="font-medium text-[#b23b3b]">
          This account does not have admin access.
        </p>
        <p className="mt-1 text-body">
          {session.user.email} (role: {session.user.role ?? "none"})
        </p>
        <button
          onClick={logout}
          className="mt-4 rounded-lg border border-line bg-white px-3 py-1.5 hover:bg-wash"
        >
          Sign in with a different account
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-wash">
      <aside className="flex w-60 shrink-0 flex-col bg-navy text-white/80">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-5">
          <Image
            src="/emblem-white.png"
            alt="DAEMUN emblem"
            width={30}
            height={23}
            priority
          />
          <div className="leading-tight">
            <p className="font-custom text-[19px] tracking-[0.08em] text-white">
              DAEMUN III
            </p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block border-l-2 py-2 pl-3 pr-2 text-[13px] transition-colors",
                  active
                    ? "border-gold bg-navy-soft text-white"
                    : "border-transparent text-white/55 hover:bg-navy-soft/60 hover:text-white/90",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p
            className="truncate pb-2 text-[11px] text-white/40"
            title={session.user.email}
          >
            {session.user.email}
          </p>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-white/15 px-3 py-1.5 text-[13px] text-white/75 transition-colors hover:border-white/30 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
