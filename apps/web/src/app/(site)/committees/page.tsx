import { CommitteeTabs } from "@/components/site/committee-tabs";
import { PageHero } from "@/components/site/section";
import { getSite } from "@/lib/site";

export const metadata = { title: "Committees" };

export default async function CommitteesPage() {
  const { committees } = await getSite();

  return (
    <>
      <PageHero
        kicker="DAEMUN III / Committees & Topics"
        title="Committees"
        lead="Two councils, four topics each. Every topic has a chair report that sets out the background, the key questions and the positions delegates are expected to research."
      />
      <CommitteeTabs committees={committees} />
    </>
  );
}
