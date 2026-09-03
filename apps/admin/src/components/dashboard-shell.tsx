// apps/admin/src/components/dashboard-shell.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "개요", exact: true },
  { href: "/dashboard/resolutions", label: "결의안 현황판" },
  { href: "/dashboard/secretariat", label: "사무국" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, error } = useSession();

  useEffect(() => {
    // 쿠키는 있으나 세션이 서버에서 만료/밴된 경우의 2차 방어선.
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

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
            onClick={() => signOut().then(() => router.push("/login"))}
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
