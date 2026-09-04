// apps/admin/src/app/dashboard/committees/page.tsx
"use client";

import { CommitteesBoard } from "@/components/committees/board";
import { useSite } from "@/lib/crud-hooks";

export default function CommitteesPage() {
  const { data, isPending, error, isFetching, refetch } = useSite();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Committees &amp; Topics</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Committee and topic information plus chair report PDFs. Saving
            reflects immediately on the public site.
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
        {data && <CommitteesBoard site={data} />}
      </div>
    </div>
  );
}
