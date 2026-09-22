import { defaultSite, type SiteData } from "@daemun/shared";

/**
 * Where the web server reaches the API: the hosted API's public origin
 * (a daemun-web project variable), or the local dev server.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export const SITE_TAG = "site";

/**
 * Fetch everything the public site renders from.
 *
 * Cached in the Next.js data cache for 60s and tagged, so the API can force a
 * refresh through POST /api/revalidate the moment content changes. If the API
 * is unreachable, the bundled default content is served so the site never
 * goes blank.
 */
export async function getSite(): Promise<SiteData> {
  try {
    const res = await fetch(`${API_URL}/api/public/site`, {
      next: { revalidate: 60, tags: [SITE_TAG] },
    });
    if (!res.ok) throw new Error(`API responded ${res.status}`);
    return (await res.json()) as SiteData;
  } catch (err) {
    console.warn("[site] falling back to default content:", (err as Error).message);
    return defaultSite;
  }
}
