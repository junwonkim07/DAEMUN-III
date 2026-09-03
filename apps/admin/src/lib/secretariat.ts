"use client";

import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";
import type {
  Department,
  Person,
  departmentCreateSchema,
  departmentUpdateSchema,
  personCreateSchema,
  personUpdateSchema,
} from "@daemun/shared";
import { adminFetch, uploadFile } from "./api";
import { makeResourceHooks, useInvalidateSite } from "./crud-hooks";

/** API가 검증하는 zod 스키마에서 그대로 추론 — 스키마가 바뀌면 여기서 타입 에러가 난다. */
export type PersonCreate = z.input<typeof personCreateSchema>;
export type PersonPatch = z.input<typeof personUpdateSchema>;
export type DepartmentCreate = z.input<typeof departmentCreateSchema>;
export type DepartmentPatch = z.input<typeof departmentUpdateSchema>;

export const peopleHooks = makeResourceHooks<Person, PersonCreate, PersonPatch>("/people");
export const departmentHooks = makeResourceHooks<Department, DepartmentCreate, DepartmentPatch>(
  "/departments",
);

/** 사진 업로드 → 해당 인물 photo 필드 갱신. */
export function useUploadPersonPhoto() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const { url } = await uploadFile(file);
      return adminFetch<Person>(`/people/${id}`, {
        method: "PATCH",
        json: { photo: url },
      });
    },
    onSuccess: invalidate,
  });
}

/**
 * 부서 삭제. DB는 부원의 departmentId를 null로 만들 뿐이라 그 사람들은 어느
 * 화면에도 안 나오게 된다 — 그래서 부원을 먼저 지우고 부서를 지운다.
 * 호출 전에 사용자에게 인원수를 포함해 확인받을 것.
 */
export function useRemoveDepartmentWithMembers() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: async ({ id, memberIds }: { id: string; memberIds: string[] }) => {
      for (const memberId of memberIds) {
        await adminFetch<{ ok: true }>(`/people/${memberId}`, { method: "DELETE" });
      }
      return adminFetch<{ ok: true }>(`/departments/${id}`, { method: "DELETE" });
    },
    onSuccess: invalidate,
    // 중간에 실패해도 이미 지운 부원은 돌아오지 않으므로 화면을 최신으로
    onError: invalidate,
  });
}
