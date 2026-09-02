// apps/admin/src/app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending, error } = useSession();

  useEffect(() => {
    // 세션 없음(401) — proxy.ts가 대부분 걸러주지만, 쿠키만 있고 세션이
    // 서버에서 이미 만료/밴 처리된 경우를 위한 2차 방어선.
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return <p className="p-6 text-sm text-neutral-500">불러오는 중...</p>;
  }

  if (error) {
    return <p className="p-6 text-sm text-red-600">세션을 확인할 수 없습니다: {error.message}</p>;
  }

  if (!session) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">대시보드</h1>
        <button
          onClick={() => signOut().then(() => router.push("/login"))}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        >
          로그아웃
        </button>
      </div>
      <p className="mt-4 text-sm text-neutral-600">
        {session.user.email}로 로그인됨 (role: {session.user.role ?? "admin"})
      </p>
      <p className="mt-8 text-sm text-neutral-400">
        화면 스캐폴딩은 여기까지. 다음: 결의안 현황판, 사무국 CRUD 등
        (handover.md §5 우선순위 참고).
      </p>
    </div>
  );
}
