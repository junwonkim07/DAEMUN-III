"use client";

import { useQuery } from "@tanstack/react-query";
import type { TelemetryRecord } from "@daemun/shared";
import { adminFetch } from "./api";

export type TelemetryFilters = {
  sessionId: string;
  type: TelemetryRecord["type"] | "";
};

export function useTelemetry(filters: TelemetryFilters) {
  return useQuery({
    queryKey: ["admin", "telemetry", filters],
    queryFn: ({ signal }) => {
      const query = new URLSearchParams({ limit: "200" });
      if (filters.sessionId) query.set("sessionId", filters.sessionId);
      if (filters.type) query.set("type", filters.type);
      return adminFetch<{ events: TelemetryRecord[] }>(`/telemetry?${query}`, { signal });
    },
  });
}
