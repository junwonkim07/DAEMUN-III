// apps/admin/src/lib/crud-hooks.ts
//
// 관리자 CRUD 리소스( /api/admin/<resource> )용 react-query 훅 팩토리.
// 모든 변경은 성공 시 site 캐시(useSite)를 무효화한다 — 화면은 항상
// GET /api/admin/site 한 곳에서 데이터를 읽으므로.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SiteData } from "@daemun/shared";
import { adminFetch } from "./api";

export const SITE_KEY = ["admin", "site"] as const;

/**
 * 모든 관리자 화면의 단일 데이터 소스: 공개 사이트가 받는 SiteData 그대로
 * (위원회·의제·결의안·사무국·일정·문서). 변경 후 SITE_KEY를 무효화하면
 * 화면 전체가 새로고침된다.
 */
export function useSite() {
  return useQuery({
    queryKey: SITE_KEY,
    queryFn: () => adminFetch<SiteData>("/site"),
  });
}

export function makeResourceHooks<
  Row extends { id: string },
  Create = Record<string, unknown>,
  Update = Partial<Create>,
>(resource: `/${string}`) {
  function useInvalidate() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: SITE_KEY });
  }

  function useCreate() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (input: Create) =>
        adminFetch<Row>(resource, { method: "POST", json: input }),
      onSuccess: invalidate,
    });
  }

  function useUpdate() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Update }) =>
        adminFetch<Row>(`${resource}/${id}`, { method: "PATCH", json: patch }),
      onSuccess: invalidate,
    });
  }

  function useRemove() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (id: string) =>
        adminFetch<{ ok: true }>(`${resource}/${id}`, { method: "DELETE" }),
      onSuccess: invalidate,
    });
  }

  /** ids를 원하는 순서대로 보내면 sortOrder가 그 순서로 재작성된다. */
  function useReorder() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (ids: string[]) =>
        adminFetch<{ ok: true }>(`${resource}/reorder`, {
          method: "PUT",
          json: { ids },
        }),
      onSuccess: invalidate,
    });
  }

  return { useCreate, useUpdate, useRemove, useReorder };
}
