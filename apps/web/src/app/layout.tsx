import type { Metadata } from "next";
import { Cormorant_SC } from "next/font/google";
import "./globals.css";
import { getSite } from "@/lib/site";

/**
 * Public pages are statically cached and re-rendered at most once a minute,
 * or immediately when the API's POST /api/revalidate invalidates the "site"
 * tag after an admin edit. `next build` still never needs the API: getSite()
 * falls back to the bundled default content when it is unreachable, and the
 * first request after deploy refreshes from the real data.
 *
 * (This was `0` — every request re-rendered the whole page on the 1-vCPU
 * server even though the data behind it was already cached.)
 */
export const revalidate = 60;

/** Display face for every heading (.font-custom in globals.css). */
const cormorantSC = Cormorant_SC({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant-sc",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { conference } = await getSite();
  return {
    title: {
      default: `${conference.name} — ${conference.theme}`,
      template: `%s — ${conference.name}`,
    },
    description: `${conference.org}. ${conference.theme}. A student-led Model United Nations conference.`,
  };
}

/**
 * Bare document shell. Page chrome lives in the route groups:
 *   (site) — navbar + footer (every public page)
 *   (auth) — none (sign-in / sign-up / onboarding screens)
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorantSC.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
