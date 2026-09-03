// 결의안 현황판이 쓰는 react-query 훅. 데이터 소스는 useSite()
// (공개 사이트가 받는 SiteData 그대로 — 위원회+의제+결의안이 한 번에 온다).
// 변경은 /api/admin/resolutions CRUD + /api/admin/uploads.
"use client";

import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";
import {
  type Resolution,
  type resolutionCreateSchema,
  type resolutionUpdateSchema,
} from "@daemun/shared";
import { adminFetch, uploadFile } from "./api";
import { makeResourceHooks, useInvalidateSite } from "./crud-hooks";

/** API가 검증하는 zod 스키마에서 그대로 추론 — 스키마가 바뀌면 여기서 타입 에러가 난다. */
export type NewResolution = z.input<typeof resolutionCreateSchema>;
export type ResolutionPatch = z.input<typeof resolutionUpdateSchema>;

export const resolutionHooks = makeResourceHooks<Resolution, NewResolution, ResolutionPatch>(
  "/resolutions",
);

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
