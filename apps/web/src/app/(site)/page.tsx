import { HeroSiena } from "@/components/site/hero-siena";
import { getSite } from "@/lib/site";

export default async function Home() {
  const { conference, schedule } = await getSite();
  return <HeroSiena conference={conference} schedule={schedule} />;
}
