import { and, desc, eq, gte, lt } from "drizzle-orm";
import { telemetryEvents } from "@daemun/db";
import type { TelemetryEvent, TelemetryEventType, TelemetryRecord } from "@daemun/shared";
import { db } from "../db";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
let lastSweep = 0;

export async function storeTelemetry(events: TelemetryEvent[], source: "browser" | "server") {
  const inserted = await db.insert(telemetryEvents).values(events.map((event) => ({
    ...event,
    source,
    occurredAt: new Date(event.occurredAt),
  }))).onConflictDoNothing({ target: telemetryEvents.id }).returning({ id: telemetryEvents.id });

  // Await both writes on serverless: an unawaited task can disappear on response.
  const now = Date.now();
  if (now - lastSweep > 60 * 60 * 1000) {
    try {
      await db.delete(telemetryEvents).where(lt(telemetryEvents.createdAt, new Date(now - RETENTION_MS)));
      lastSweep = now;
    } catch {
      // Diagnostics must not recursively report a diagnostic-storage error.
      console.warn("[telemetry] retention sweep failed");
    }
  }
  return inserted.length;
}

export async function listTelemetry(filters: {
  sessionId?: string; type?: TelemetryEventType; limit: number;
}): Promise<TelemetryRecord[]> {
  const rows = await db.select().from(telemetryEvents).where(and(
    gte(telemetryEvents.createdAt, new Date(Date.now() - RETENTION_MS)),
    filters.sessionId ? eq(telemetryEvents.sessionId, filters.sessionId) : undefined,
    filters.type ? eq(telemetryEvents.type, filters.type) : undefined,
  )).orderBy(desc(telemetryEvents.createdAt)).limit(filters.limit);
  return rows.map((row) => ({
    ...row,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}
