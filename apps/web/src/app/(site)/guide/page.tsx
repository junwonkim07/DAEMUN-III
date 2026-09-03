import { AnimeScrollbar } from "@/components/site/anime-scrollbar";
import { DocsPage, type DocsSection } from "@/components/site/docs-page";
import { PastVideos } from "@/components/site/past-videos";
import { PageHero } from "@/components/site/section";

import Committees from "@/content/guide/committees.mdx";
import Rop from "@/content/guide/rop.mdx";
import Clauses from "@/content/guide/clauses.mdx";
import Documents from "@/content/guide/documents.mdx";

export const metadata = { title: "Guide to MUN" };

/**
 * Guide content lives in real MDX documents under src/content/guide/ —
 * edit those files to change this page.
 */
const sections: DocsSection[] = [
  { id: "committees", title: "The committees", content: <Committees /> },
  { id: "rop", title: "How a session runs", content: <Rop /> },
  { id: "clauses", title: "Writing a resolution", content: <Clauses /> },
  { id: "downloads", title: "Documents", content: <Documents /> },
  { id: "videos", title: "Watch past MUN videos", content: <PastVideos /> },
];

export default function GuidePage() {
  return (
    <>
      <AnimeScrollbar />
      <PageHero
        kicker="DAEMUN III / Guide to MUN"
        title="Guide to MUN"
        lead="If this is your first conference, start here. What the two committees do, how a session actually runs, how to write a resolution, and every document you will need."
      />
      <DocsPage sections={sections} />
    </>
  );
}
