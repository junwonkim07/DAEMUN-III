// apps/admin/src/lib/resolutions.ts
//
// 결의안 현황판이 쓰는 react-query 훅. 데이터 소스는 GET /api/admin/site
// (공개 사이트가 받는 SiteData 그대로 — 위원회+의제+결의안이 한 번에 온다).
// 변경은 /api/admin/resolutions CRUD + /api/admin/uploads.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Resolution,
  ResolutionStatus,
  SiteData,
} from "@daemun/shared";
import { adminFetch, uploadFile } from "./api";

const SITE_KEY = ["admin", "site"] as const;

export function useSite() {
  return useQuery({
    queryKey: SITE_KEY,
    queryFn: () => adminFetch<SiteData>("/site"),
  });
}

function useInvalidateSite() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SITE_KEY });
}

export type NewResolution = {
  committeeId: string;
  topicId: string;
  label?: string;
  submitter?: string;
  status?: ResolutionStatus;
  document?: string | null;
};

export function useCreateResolution() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: (input: NewResolution) =>
      adminFetch<Resolution>("/resolutions", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateResolution() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<Resolution, "id" | "sortOrder" | "updatedAt">>;
    }) => adminFetch<Resolution>(`/resolutions/${id}`, { method: "PATCH", json: patch }),
    onSuccess: invalidate,
  });
}

export function useDeleteResolution() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: (id: string) =>
      adminFetch<{ ok: true }>(`/resolutions/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/** 파일 업로드 후 해당 결의안 document 필드를 갱신한다. */
export function useUploadResolutionDoc() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const { url } = await uploadFile(file);
      return adminFetch<Resolution>(`/resolutions/${id}`, {
        method: "PATCH",
        json: { document: url },
      });
    },
    onSuccess: invalidate,
  });
}
