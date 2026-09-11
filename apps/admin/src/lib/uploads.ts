// apps/admin/src/lib/uploads.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { adminFetch } from "./api";

export type UploadsGcReport = { scanned: number; deleted: string[]; freedBytes: number };

/**
 * Deletes uploaded files no record references anymore (replaced/removed
 * images, reports, documents, photos). The mutation's own result — what was
 * deleted and how many bytes it freed — is all the Overview shows; there is
 * no separate storage figure to refresh now that the host-disk gauges are gone.
 */
export function useCleanupUploads() {
  return useMutation({
    mutationFn: () => adminFetch<UploadsGcReport>("/uploads/gc", { method: "POST" }),
  });
}
