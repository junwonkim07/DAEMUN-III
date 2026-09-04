import { AppleNav } from "@/components/site/apple-nav";
import { SiteFooter } from "@/components/site/footer";
import { Presence } from "@/components/site/presence";
import { getSite } from "@/lib/site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { conference } = await getSite();

  return (
    <>
      <AppleNav />
      <main className="flex-1 pt-12">{children}</main>
      <SiteFooter conference={conference} />
      <Presence />
    </>
  );
}
