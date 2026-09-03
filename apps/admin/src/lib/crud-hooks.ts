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

/** 변경 성공 후 site 캐시를 다시 받는다. 반환된 프로미스를 onSuccess에서
 *  돌려주므로 mutation의 isPending은 새 데이터가 도착할 때까지 유지된다 —
 *  순서 변경(↑/↓)처럼 최신 목록이 필요한 조작이 stale 데이터로 연타되지 않게. */
export function useInvalidateSite() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SITE_KEY });
}

export function makeResourceHooks<
  Row extends { id: string },
  Create = Record<string, unknown>,
  Update = Partial<Create>,
>(resource: `/${string}`) {
  function useCreate() {
    const invalidate = useInvalidateSite();
    return useMutation({
      mutationFn: (input: Create) =>
        adminFetch<Row>(resource, { method: "POST", json: input }),
      onSuccess: invalidate,
    });
  }

  function useUpdate() {
    const invalidate = useInvalidateSite();
    return useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Update }) =>
        adminFetch<Row>(`${resource}/${id}`, { method: "PATCH", json: patch }),
      onSuccess: invalidate,
    });
  }

  function useRemove() {
    const invalidate = useInvalidateSite();
    return useMutation({
      mutationFn: (id: string) =>
        adminFetch<{ ok: true }>(`${resource}/${id}`, { method: "DELETE" }),
      onSuccess: invalidate,
    });
  }

  /** ids를 원하는 순서대로 보내면 sortOrder가 그 순서로 재작성된다. */
  function useReorder() {
    const invalidate = useInvalidateSite();
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
