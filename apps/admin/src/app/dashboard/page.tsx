"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatBytes, formatUptime, useStats } from "@/lib/stats";

export default function DashboardPage() {
  const { data, isPending, error, dataUpdatedAt } = useStats();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Overview</h1>
        {data && (
          <p className="text-xs text-neutral-400">
            Auto-refreshes every 10 s · updated{" "}
            {new Date(dataUpdatedAt).toLocaleTimeString("en-GB")}
          </p>
        )}
      </div>

      {isPending && <p className="mt-4 text-sm text-neutral-500">Loading…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600">Could not load stats: {error.message}</p>
      )}

      {data && (
        <div className="mt-6 space-y-8">
          {/* Live */}
          <section>
            <SectionTitle>Live</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Online now"
                value={data.online}
                hint="visitors active on the public site in the last 2 minutes"
                accent
              />
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
              Resolutions{" "}
              <Link href="/dashboard/resolutions" className="ml-2 text-xs font-normal text-neutral-500 underline">
                open board
              </Link>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Waiting for review" value={data.resolutions.awaiting} tone="neutral" />
              <Stat label="Under review" value={data.resolutions.review} tone="amber" />
              <Stat label="Approved" value={data.resolutions.approved} tone="emerald" />
              <Stat label="Published" value={data.resolutions.published} tone="sky" />
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              {data.resolutions.total} resolution{data.resolutions.total === 1 ? "" : "s"} in total.
              Approved resolutions stay hidden from delegates until they are published.
            </p>
          </section>

          {/* Server */}
          <section>
            <SectionTitle>Server</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Gauge
                label="CPU"
                pct={data.system.cpu.usagePct}
                detail={`load ${data.system.cpu.load1.toFixed(2)} · ${data.system.cpu.cores} core${data.system.cpu.cores === 1 ? "" : "s"}`}
              />
              <Usage label="RAM" used={data.system.memory.usedBytes} total={data.system.memory.totalBytes} />
              <Usage label="Swap" used={data.system.swap.usedBytes} total={data.system.swap.totalBytes} />
              <Usage label="Disk" used={data.system.disk.usedBytes} total={data.system.disk.totalBytes} />
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Host uptime {formatUptime(data.system.uptimeSec)}.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 flex items-baseline text-sm font-semibold">{children}</h2>;
}

const TONES = {
  neutral: "text-neutral-900",
  amber: "text-amber-600",
  emerald: "text-emerald-700",
  sky: "text-sky-700",
} as const;

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: keyof typeof TONES;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4",
        accent ? "border-neutral-900" : "border-neutral-200",
      )}
    >
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function barColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 75) return "bg-amber-500";
  return "bg-neutral-900";
}

function Bar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-neutral-100">
      <div className={cn("h-full rounded", barColor(clamped))} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function Gauge({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{pct.toFixed(0)}%</p>
      </div>
      <Bar pct={pct} />
      <p className="mt-1 text-[11px] text-neutral-400">{detail}</p>
    </div>
  );
}

function Usage({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{total > 0 ? `${pct.toFixed(0)}%` : "—"}</p>
      </div>
      <Bar pct={pct} />
      <p className="mt-1 text-[11px] text-neutral-400">
        {total > 0 ? `${formatBytes(used)} of ${formatBytes(total)}` : "not available"}
      </p>
    </div>
  );
}
