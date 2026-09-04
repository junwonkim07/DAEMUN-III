// apps/admin/src/app/dashboard/schedule/page.tsx
"use client";

import { ScheduleBoard } from "@/components/schedule/board";
import { useSite } from "@/lib/crud-hooks";

export default function SchedulePage() {
  const { data, isPending, error, isFetching, refetch } = useSite();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Schedule</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            The day-by-day schedule. Saving reflects immediately in the
            homepage schedule section. The section is hidden when there are
            no dates.
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

      <div className="mt-6">
        {isPending && <p className="text-sm text-neutral-500">Loading...</p>}
        {error && (
          <p className="text-sm text-red-600">
            Failed to load: {error.message}
          </p>
        )}
        {data && <ScheduleBoard site={data} />}
      </div>
    </div>
  );
}
