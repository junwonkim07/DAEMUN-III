import type { Metadata } from "next";

import { AccountView, type CommitteeSummary } from "@/components/site/account-view";
import { getSite } from "@/lib/site";

export const metadata: Metadata = { title: "My page" };

export default async function AccountPage() {
  const { committees } = await getSite();
  const summaries: CommitteeSummary[] = committees.map((c) => ({
    slug: c.slug,
    code: c.code,
    name: c.name,
  }));
  return <AccountView committees={summaries} />;
}
