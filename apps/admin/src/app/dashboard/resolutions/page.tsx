// apps/admin/src/app/dashboard/resolutions/page.tsx
"use client";

import type { ResolutionStatus } from "@daemun/shared";
import { ResolutionBoard } from "@/components/resolutions/board";
import { STATUS_META } from "@/components/resolutions/controls";
import { useSite } from "@/lib/crud-hooks";

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
          { awaiting: 0, review: 0, approved: 0, published: 0 },
        )
    : null;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Resolutions</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Topics and resolution status by committee. Saving reflects
            immediately on the public site.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {counts && (
        <div className="mt-4 flex gap-2 text-xs">
          {(["awaiting", "review", "approved", "published"] as ResolutionStatus[]).map((s) => (
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
          <p className="text-sm text-neutral-500">Loading...</p>
        )}
        {error && (
          <p className="text-sm text-red-600">
            Failed to load: {error.message}
          </p>
        )}
        {data && <ResolutionBoard site={data} />}
      </div>
    </div>
  );
}
