"use client";

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./api";

/** Shape of GET /api/admin/stats (apps/api/src/routes/admin.ts). */
export type Stats = {
  online: number;
  resolutions: {
    awaiting: number;
    review: number;
    approved: number;
    published: number;
    total: number;
  };
  accounts: { participants: number; admins: number; total: number };
  system: {
    cpu: { usagePct: number; load1: number; cores: number };
    memory: { totalBytes: number; usedBytes: number };
    swap: { totalBytes: number; usedBytes: number };
    disk: { totalBytes: number; usedBytes: number };
    uptimeSec: number;
  };
  generatedAt: string;
};

export const STATS_KEY = ["admin", "stats"] as const;

/** Overview numbers, refreshed every 10 s while the page is open. */
export function useStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => adminFetch<Stats>("/stats"),
    refetchInterval: 10_000,
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

export function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
