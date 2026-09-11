// apps/admin/src/components/teams/board.tsx
//
// §6-1 decision B: the admin creates teams and assigns delegates into them —
// there's no self-service "join a team" flow. One team = one topic.
"use client";

import { useState } from "react";
import type { CommitteeWithTopics, SiteData, Team, Topic } from "@daemun/shared";
import { type AdminUser, useAssignTeam } from "@/lib/accounts";
import { ApiError } from "@/lib/api";
import { teamHooks, useTeams, type TeamCreate } from "@/lib/teams";
import { InlineText } from "@/components/inline-edit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";

function msg(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : "Save failed.";
}

export function TeamsBoard({ site, users }: { site: SiteData; users: AdminUser[] }) {
  const { data: teams, isPending, error } = useTeams();
  const delegates = users.filter((u) => u.role !== "admin");
  const unassigned = delegates.filter((u) => !u.teamId);

  if (isPending) return <p className="text-sm text-muted">Loading teams…</p>;
  if (error) return <p className="text-sm text-[#b23b3b]">Failed to load: {error.message}</p>;

  return (
    <div className="space-y-6">
      {unassigned.length > 0 && (
        <p className="text-xs text-faint">
          {unassigned.length} delegate{unassigned.length === 1 ? "" : "s"} not yet on a team.
        </p>
      )}
      {site.committees.map((committee) => (
        <CommitteeTeams
          key={committee.id}
          committee={committee}
          teams={teams ?? []}
          delegates={delegates}
        />
      ))}
    </div>
  );
}

function CommitteeTeams({
  committee,
  teams,
  delegates,
}: {
  committee: CommitteeWithTopics;
  teams: Team[];
  delegates: AdminUser[];
}) {
  return (
    <Card className="overflow-hidden">
      <header className="flex items-baseline gap-2 border-b border-line bg-wash/60 px-4 py-2">
        <span className="text-xs font-semibold text-body">{committee.code}</span>
        <span className="text-sm text-ink">{committee.name}</span>
      </header>
      <div className="space-y-4 p-4">
        {committee.topics.length === 0 ? (
          <p className="text-xs text-faint">No topics yet.</p>
        ) : (
          committee.topics.map((topic) => (
            <TopicTeams
              key={topic.id}
              committee={committee}
              topic={topic}
              teams={teams.filter((t) => t.topicId === topic.id)}
              delegates={delegates}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function TopicTeams({
  committee,
  topic,
  teams,
  delegates,
}: {
  committee: CommitteeWithTopics;
  topic: Topic;
  teams: Team[];
  delegates: AdminUser[];
}) {
  const create = teamHooks.useCreate();

  const newTeam: TeamCreate = {
    committeeId: committee.id,
    topicId: topic.id,
    name: `Team ${teams.length + 1}`,
  };

  return (
    <div className="rounded-lg border border-line bg-wash/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-ink">{topic.title}</span>
        <Button disabled={create.isPending} onClick={() => create.mutate(newTeam)}>
          + Add team
        </Button>
      </div>
      {create.error && <p className="mt-1 text-xs text-[#b23b3b]">{msg(create.error)}</p>}

      {teams.length === 0 ? (
        <p className="mt-2 text-xs text-faint">No teams assigned to this topic yet.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} delegates={delegates} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, delegates }: { team: Team; delegates: AdminUser[] }) {
  const update = teamHooks.useUpdate();
  const remove = teamHooks.useRemove();
  const assign = useAssignTeam();

  const members = delegates.filter((u) => u.teamId === team.id);
  const unassigned = delegates.filter((u) => !u.teamId);
  const [picking, setPicking] = useState(false);

  return (
    <Card className="p-3">
      <div className="flex items-start gap-2">
        <InlineText
          ariaLabel="Team name"
          value={team.name}
          placeholder="Team name"
          pending={update.isPending}
          className="flex-1 font-medium"
          onCommit={(name) => update.mutateAsync({ id: team.id, patch: { name } })}
        />
        <IconButton
          label="Delete team"
          danger
          disabled={remove.isPending}
          onClick={() => {
            const warning =
              members.length > 0
                ? `Delete "${team.name || "this team"}"? Its ${members.length} member(s) will be unassigned; any resolution they submitted stays but loses its team link.`
                : `Delete "${team.name || "this team"}"?`;
            if (window.confirm(warning)) remove.mutate(team.id);
          }}
        >
          ✕
        </IconButton>
      </div>
      {msg(remove.error) && <p className="mt-1 text-xs text-[#b23b3b]">{msg(remove.error)}</p>}

      <div className="mt-2 space-y-1.5">
        {members.length === 0 ? (
          <p className="text-xs text-faint">No members yet.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-md border border-line bg-wash/60 px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{m.name || m.email}</p>
                <p className="truncate text-faint">{m.email}</p>
              </div>
              <button
                type="button"
                disabled={assign.isPending}
                onClick={() =>
                  assign.mutate({
                    userId: m.id,
                    teamRole: m.teamRole === "lead" ? "member" : "lead",
                  })
                }
                className="shrink-0 rounded border border-line px-2 py-1 text-body hover:bg-white disabled:opacity-40"
              >
                {m.teamRole === "lead" ? "Lead" : "Member"}
              </button>
              <button
                type="button"
                disabled={assign.isPending}
                onClick={() => assign.mutate({ userId: m.id, teamId: null, teamRole: null })}
                className="shrink-0 rounded p-1 text-faint hover:bg-[#fdf1f1] hover:text-[#b23b3b] disabled:opacity-40"
                aria-label={`Remove ${m.name || m.email} from team`}
                title="Remove from team"
              >
                ✕
              </button>
            </div>
          ))
        )}
        {msg(assign.error) && <p className="text-xs text-[#b23b3b]">{msg(assign.error)}</p>}

        {picking ? (
          <select
            autoFocus
            disabled={unassigned.length === 0}
            className="w-full rounded-md border border-line px-2 py-1.5 text-xs"
            defaultValue=""
            onChange={(e) => {
              const userId = e.target.value;
              if (userId) assign.mutate({ userId, teamId: team.id, teamRole: "member" });
              setPicking(false);
            }}
            onBlur={() => setPicking(false)}
          >
            <option value="" disabled>
              {unassigned.length === 0 ? "No unassigned delegates" : "Pick a delegate…"}
            </option>
            {unassigned.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        ) : (
          <Button variant="ghost" onClick={() => setPicking(true)}>
            + Add member
          </Button>
        )}
      </div>
    </Card>
  );
}
