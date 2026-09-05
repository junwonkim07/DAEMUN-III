// apps/admin/src/lib/teams.ts
//
// Teams aren't part of SiteData (the public site never needs them), so
// unlike every other resource this can't just piggyback on useSite() /
// makeResourceHooks' SITE_KEY invalidation — it gets its own small query +
// mutation set, same shape as makeResourceHooks but keyed to TEAMS_KEY.
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import type { Team, teamCreateSchema, teamUpdateSchema } from "@daemun/shared";
import { adminFetch } from "./api";
import { useInvalidateSite } from "./crud-hooks";

export type TeamCreate = z.input<typeof teamCreateSchema>;
export type TeamPatch = z.input<typeof teamUpdateSchema>;

const TEAMS_KEY = ["admin", "teams"] as const;

export function useTeams() {
  return useQuery({
    queryKey: TEAMS_KEY,
    queryFn: () => adminFetch<Team[]>("/teams"),
  });
}

function useInvalidateTeams() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: TEAMS_KEY });
}

export const teamHooks = {
  useCreate() {
    const invalidate = useInvalidateTeams();
    return useMutation({
      mutationFn: (input: TeamCreate) => adminFetch<Team>("/teams", { method: "POST", json: input }),
      onSuccess: invalidate,
    });
  },
  useUpdate() {
    const invalidate = useInvalidateTeams();
    return useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: TeamPatch }) =>
        adminFetch<Team>(`/teams/${id}`, { method: "PATCH", json: patch }),
      onSuccess: invalidate,
    });
  },
  useRemove() {
    const invalidate = useInvalidateTeams();
    return useMutation({
      mutationFn: (id: string) => adminFetch<{ ok: true }>(`/teams/${id}`, { method: "DELETE" }),
      onSuccess: invalidate,
    });
  },
};

/** approved -> published for every resolution still sitting at "approved". */
export function usePublishApproved() {
  const invalidate = useInvalidateSite();
  return useMutation({
    mutationFn: () =>
      adminFetch<{ published: number }>("/resolutions/publish-approved", { method: "POST" }),
    onSuccess: invalidate,
  });
}
