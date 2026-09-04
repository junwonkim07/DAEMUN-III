// apps/admin/src/app/dashboard/faqs/page.tsx
"use client";

import { FaqBoard } from "@/components/faqs/board";
import { useFaqs } from "@/lib/faqs";

export default function FaqsPage() {
  const { data, isPending, error, isFetching, refetch } = useFaqs();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">FAQ</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Questions and answers the guide chatbot uses as source material.
            Only items marked public are used by the chatbot. They are not
            shown on the public site.
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
        {data && <FaqBoard faqs={data} />}
      </div>
    </div>
  );
}
