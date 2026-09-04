// apps/admin/src/app/dashboard/secretariat/page.tsx
"use client";

import { SecretariatBoard } from "@/components/secretariat/board";
import { useSite } from "@/lib/crud-hooks";

export default function SecretariatPage() {
  const { data, isPending, error, isFetching, refetch } = useSite();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Secretariat</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Departments and people, photos, greetings, committee chairs, and
            order. Saving reflects immediately on the public site.
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

      <div className="mt-6 max-w-3xl">
        {isPending && <p className="text-sm text-neutral-500">Loading...</p>}
        {error && (
          <p className="text-sm text-red-600">
            Failed to load: {error.message}
          </p>
        )}
        {data && <SecretariatBoard site={data} />}
      </div>
    </div>
  );
}
