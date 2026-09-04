// apps/admin/src/lib/accounts.ts
//
// better-auth admin 플러그인(`/api/auth/admin/*`)을 react-query로 감싼다.
// 클라이언트 메서드는 throw 대신 { data, error }를 돌려주므로 여기서 throw로 바꾼다.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: string | Date;
  grade?: string | null;
  committee?: string | null;
  munExperience?: string | null;
};

const USERS_KEY = ["admin", "users"] as const;

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await authClient.admin.listUsers({
        query: { limit: 500 },
      });
      if (error) throw new Error(error.message ?? "Failed to load accounts.");
      const users = (data?.users ?? []) as AdminUser[];
      return [...users].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      );
    },
  });
}

function useAdminMutation<V>(
  run: (v: V) => Promise<{ error?: { message?: string } | null }>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: V) => {
      const { error } = await run(v);
      if (error) throw new Error(error.message ?? "Request failed.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export const useCreateAdmin = () =>
  useAdminMutation<{ email: string; password: string; name: string }>((v) =>
    authClient.admin.createUser({ ...v, role: "admin" }),
  );

export const useSetRole = () =>
  useAdminMutation<{ userId: string; role: "admin" | "delegate" }>((v) =>
    // 서버 set-role은 임의 문자열 role을 받는다 (union<string, string[]>).
    // 클라이언트 타입만 "user"|"admin"으로 좁혀져 있어 캐스팅한다.
    authClient.admin.setRole({
      userId: v.userId,
      role: v.role as "admin",
    }),
  );

export const useBanUser = () =>
  useAdminMutation<{ userId: string; banReason?: string }>((v) =>
    authClient.admin.banUser(v),
  );

export const useUnbanUser = () =>
  useAdminMutation<{ userId: string }>((v) => authClient.admin.unbanUser(v));
