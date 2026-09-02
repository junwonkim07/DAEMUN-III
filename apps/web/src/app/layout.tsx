import type { Metadata } from "next";
import { Cormorant_SC } from "next/font/google";
import "./globals.css";
import { AppleNav } from "@/components/site/apple-nav";
import { SiteFooter } from "@/components/site/footer";
import { getSite } from "@/lib/site";

/**
 * Render per request so `next build` never needs the API. The site payload
 * itself is still cached (60s / tag "site") inside getSite().
 */
export const revalidate = 0;

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { conference } = await getSite();

  return (
    <html lang="en" className={`${cormorantSC.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppleNav />
        <main className="flex-1 pt-12">{children}</main>
        <SiteFooter conference={conference} />
      </body>
    </html>
  );
}
