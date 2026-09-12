// apps/admin/src/app/dashboard/announcements/page.tsx
"use client";

import { AnnouncementsBoard } from "@/components/announcements/board";
import { Screen } from "@/components/ui/screen";
import { useSite } from "@/lib/crud-hooks";

export default function AnnouncementsPage() {
  const { data, isPending, error, isFetching, refetch } = useSite();

  return (
    <Screen
      title="Announcements"
      subtitle="Schedule changes, corrections and urgent notices. Published ones show on the public /announcements page, newest first; urgent ones are pinned to the top."
      onRefresh={() => refetch()}
      refreshing={isFetching}
      pending={isPending}
      error={error}
    >
      {data && <AnnouncementsBoard announcements={data.announcements} />}
    </Screen>
  );
}
