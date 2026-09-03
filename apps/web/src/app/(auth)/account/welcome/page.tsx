import type { Metadata } from "next";

import { Onboarding, type CommitteeOption } from "@/components/auth/onboarding";
import { getSite } from "@/lib/site";

export const metadata: Metadata = { title: "Set up your profile" };

/**
 * Landing page of the email-confirmation link (the API redirects here after
 * verifying and signing the delegate in). Also reachable from the account
 * page with ?edit=1 to change details later.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ committees }, { edit }] = await Promise.all([getSite(), searchParams]);

  const options: CommitteeOption[] = committees.map((c) => ({
    slug: c.slug,
    code: c.code,
    name: c.name,
    image: c.image,
  }));

  return <Onboarding committees={options} mode={edit === "1" ? "edit" : "welcome"} />;
}
