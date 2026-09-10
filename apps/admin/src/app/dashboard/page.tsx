"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { formatBytes, useStats } from "@/lib/stats";
import { useCleanupUploads } from "@/lib/uploads";

export default function DashboardPage() {
  const { data, isPending, error, dataUpdatedAt } = useStats();

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Overview">
        {data && (
          <p className="text-xs text-faint">
            Auto-refreshes every 60 s · updated{" "}
            {new Date(dataUpdatedAt).toLocaleTimeString("en-GB")}
          </p>
        )}
      </PageHeader>

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {error && (
        <p className="mt-6 text-sm text-[#b23b3b]">
          Could not load stats: {error.message}
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-8">
          {/* Accounts */}
          <section>
            <SectionTitle>Accounts</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Total participants"
                value={data.accounts.participants}
                hint={`delegate accounts · ${data.accounts.admins} admin${data.accounts.admins === 1 ? "" : "s"}`}
              />
            </div>
          </section>

          {/* Resolutions */}
          <section>
            <SectionTitle>
              Resolutions
              <Link
                href="/dashboard/resolutions"
                className="ml-2 text-xs font-normal text-brand underline-offset-2 hover:underline"
              >
                open board
              </Link>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Waiting for review" value={data.resolutions.awaiting} tone="faint" />
              <Stat label="Under review" value={data.resolutions.review} tone="gold" />
              <Stat label="Approved" value={data.resolutions.approved} tone="brand" />
              <Stat label="Published" value={data.resolutions.published} tone="navy" />
            </div>
            <p className="mt-2 text-xs text-faint">
              {data.resolutions.total} resolution{data.resolutions.total === 1 ? "" : "s"} in total.
              Approved resolutions stay hidden from delegates until they are published.
            </p>
          </section>

          {/* Storage */}
          <section>
            <SectionTitle>Storage</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-faint">
                Replacing or removing a file never deletes the old one. Sweep the
                orphans here.
              </p>
              <CleanupUploadsButton />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-custom mb-2.5 flex items-baseline text-[17px] tracking-[0.02em] text-ink">
      {children}
    </h2>
  );
}

const TONES = {
  faint: "text-faint",
  gold: "text-gold",
  brand: "text-brand",
  navy: "text-navy",
} as const;

function Stat({
  label,
  value,
  hint,
  tone = "navy",
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: keyof typeof TONES;
  accent?: boolean;
}) {
  return (
    <Card className={cn("p-4", accent && "border-gold")}>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("font-custom mt-1 text-[34px] leading-none tabular-nums", TONES[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-faint">{hint}</p>}
    </Card>
  );
}

/**
 * Replacing or removing an image/report/document/photo elsewhere in the
 * panel never deletes the old file — this sweeps whatever no record
 * references anymore. Skips anything uploaded in the last 10 minutes so an
 * in-flight upload is never at risk.
 */
function CleanupUploadsButton() {
  const cleanup = useCleanupUploads();
  return (
    <span className="flex items-center gap-2 text-xs">
      <Button onClick={() => cleanup.mutate()} disabled={cleanup.isPending} className="text-xs">
        {cleanup.isPending ? "Cleaning up…" : "Clean up unused uploads"}
      </Button>
      {cleanup.data && (
        <span className="text-faint">
          {cleanup.data.deleted.length === 0
            ? "nothing to clean up"
            : `removed ${cleanup.data.deleted.length} file${cleanup.data.deleted.length === 1 ? "" : "s"} · freed ${formatBytes(cleanup.data.freedBytes)}`}
        </span>
      )}
      {cleanup.error && (
        <span className="text-[#b23b3b]">{(cleanup.error as Error).message}</span>
      )}
    </span>
  );
}
