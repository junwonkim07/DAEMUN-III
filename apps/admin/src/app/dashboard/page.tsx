// apps/admin/src/app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useSite } from "@/lib/crud-hooks";

export default function DashboardPage() {
  const { data, isPending, error } = useSite();

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">개요</h1>

      {isPending && (
        <p className="mt-4 text-sm text-neutral-500">불러오는 중...</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600">
          데이터를 불러오지 못했습니다: {error.message}
        </p>
      )}

      {data && (
        <div className="mt-6 grid max-w-lg grid-cols-2 gap-3">
          <Stat label="위원회" value={data.committees.length} />
          <Stat
            label="의제"
            value={data.committees.reduce((n, c) => n + c.topics.length, 0)}
          />
          <Stat
            label="결의안"
            value={Object.values(data.resolutions).reduce(
              (n, rs) => n + rs.length,
              0,
            )}
          />
          <Stat
            label="승인됨"
            value={Object.values(data.resolutions)
              .flat()
              .filter((r) => r.status === "approved").length}
          />
        </div>
      )}

      <p className="mt-8 text-sm text-neutral-600">
        컨퍼런스 당일 운영은{" "}
        <Link
          href="/dashboard/resolutions"
          className="font-medium text-neutral-900 underline"
        >
          결의안 현황판
        </Link>
        에서, 명단·인사말은 사무국 화면에서. 회의정보·위원회·의제·일정·문서 화면은 이후 추가됩니다 (handover.md §5).
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
