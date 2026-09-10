"use client";

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./api";

/** Shape of GET /api/admin/stats (apps/api/src/routes/admin.ts). */
export type Stats = {
  resolutions: {
    awaiting: number;
    review: number;
    approved: number;
    published: number;
    total: number;
  };
  accounts: { participants: number; admins: number; total: number };
  generatedAt: string;
};

export const STATS_KEY = ["admin", "stats"] as const;

/**
 * Overview numbers, refreshed every 60 s while the page is open. It used to
 * be 10 s for the live visitor count and host gauges; those are gone, and on
 * a managed Postgres that sleeps when idle a 10 s poll from an open admin tab
 * is exactly what keeps the compute awake and burns the free-tier hours.
 */
export function useStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => adminFetch<Stats>("/stats"),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
