// apps/admin/src/app/dashboard/accounts/page.tsx
"use client";

import { AccountsBoard } from "@/components/accounts/board";
import { useUsers } from "@/lib/accounts";

export default function AccountsPage() {
  const { data, isPending, error, isFetching, refetch } = useUsers();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Accounts</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Issue admin accounts, change roles, and ban users. Delegate
            accounts self-register on the public site.
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
        {data && <AccountsBoard users={data} />}
      </div>
    </div>
  );
}
