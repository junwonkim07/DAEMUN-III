// apps/admin/src/app/dashboard/teams/page.tsx
"use client";

import { TeamsBoard } from "@/components/teams/board";
import { Screen } from "@/components/ui/screen";
import { useSite } from "@/lib/crud-hooks";
import { useUsers } from "@/lib/accounts";

export default function TeamsPage() {
  const site = useSite();
  const users = useUsers();

  return (
    <Screen
      title="Teams"
      subtitle="Assign delegates to a team per topic. Only the team's lead can upload the draft resolution — set who's lead from here."
      onRefresh={() => {
        site.refetch();
        users.refetch();
      }}
      refreshing={site.isFetching || users.isFetching}
      pending={site.isPending || users.isPending}
      error={site.error ?? users.error ?? null}
    >
      {site.data && users.data && <TeamsBoard site={site.data} users={users.data} />}
    </Screen>
  );
}
