// apps/admin/src/app/dashboard/resolutions/page.tsx
"use client";

import type { ResolutionStatus } from "@daemun/shared";
import { ResolutionBoard } from "@/components/resolutions/board";
import { STATUS_META } from "@/components/resolutions/controls";
import { useSite } from "@/lib/resolutions";

export default function ResolutionsPage() {
  const { data, isPending, error, isFetching, refetch } = useSite();

  const counts = data
    ? Object.values(data.resolutions)
        .flat()
        .reduce<Record<ResolutionStatus, number>>(
          (acc, r) => {
            acc[r.status] += 1;
            return acc;
          },
          { awaiting: 0, review: 0, approved: 0 },
        )
    : null;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">결의안 현황판</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            위원회별 의제와 결의안 상태. 저장하면 공개 사이트에 바로 반영됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          {isFetching ? "새로고침 중…" : "새로고침"}
        </button>
      </div>

      {counts && (
        <div className="mt-4 flex gap-2 text-xs">
          {(["awaiting", "review", "approved"] as ResolutionStatus[]).map((s) => (
            <span
              key={s}
              className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 font-medium text-neutral-600"
            >
              {STATUS_META[s].label} {counts[s]}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6">
        {isPending && (
          <p className="text-sm text-neutral-500">불러오는 중...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">
            불러오지 못했습니다: {error.message}
          </p>
        )}
        {data && <ResolutionBoard site={data} />}
      </div>
    </div>
  );
}
