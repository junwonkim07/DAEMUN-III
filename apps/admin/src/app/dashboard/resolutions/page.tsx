// apps/admin/src/app/dashboard/resolutions/page.tsx
"use client";

import type { ResolutionStatus } from "@daemun/shared";
import { ResolutionBoard } from "@/components/resolutions/board";
import { STATUS_META } from "@/components/resolutions/controls";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useSite } from "@/lib/crud-hooks";
import { usePublishApproved } from "@/lib/teams";

const ORDER: ResolutionStatus[] = ["awaiting", "review", "approved", "published"];

export default function ResolutionsPage() {
  const { data, isPending, error, isFetching, refetch } = useSite();
  const publish = usePublishApproved();

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
    <Screen
      title="Resolutions"
      subtitle="Topics and resolution status by committee. Saving reflects immediately on the public site."
      onRefresh={() => refetch()}
      refreshing={isFetching}
      pending={isPending}
      error={error}
      headerExtra={
        <Button
          onClick={() => {
            if (
              counts &&
              counts.approved > 0 &&
              window.confirm(
                `Publish all ${counts.approved} approved resolution(s)? They become visible on the public site immediately.`,
              )
            )
              publish.mutate();
          }}
          disabled={publish.isPending || !counts?.approved}
        >
          {publish.isPending ? "Publishing…" : "Publish approved"}
        </Button>
      }
    >
      {publish.error && (
        <p className="mb-3 text-sm text-[#b23b3b]">{(publish.error as Error).message}</p>
      )}

      {counts && (
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          {ORDER.map((s) => (
            <span
              key={s}
              className="rounded-full border border-line bg-white px-2.5 py-1 font-medium text-body"
            >
              {STATUS_META[s].label} {counts[s]}
            </span>
          ))}
        </div>
      )}

      {data && <ResolutionBoard site={data} />}
    </Screen>
  );
}
