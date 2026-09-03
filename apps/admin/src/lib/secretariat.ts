// apps/admin/src/lib/secretariat.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Department, Person } from "@daemun/shared";
import { adminFetch, uploadFile } from "./api";
import { makeResourceHooks, SITE_KEY } from "./crud-hooks";

type PersonCreate = {
  name: string;
  role?: string;
  photo?: string | null;
  greeting?: string | null;
  section: Person["section"];
  departmentId?: string | null;
  committeeId?: string | null;
  sortOrder?: number;
};

type DepartmentCreate = { name: string; blurb?: string; sortOrder?: number };

export const peopleHooks = makeResourceHooks<Person, PersonCreate>("/people");
export const departmentHooks = makeResourceHooks<Department, DepartmentCreate>(
  "/departments",
);

/** 사진 업로드 → 해당 인물 photo 필드 갱신. */
export function useUploadPersonPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const { url } = await uploadFile(file);
      return adminFetch<Person>(`/people/${id}`, {
        method: "PATCH",
        json: { photo: url },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SITE_KEY }),
  });
}
