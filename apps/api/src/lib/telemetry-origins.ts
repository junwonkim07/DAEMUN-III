const PUBLIC_SITE_ORIGINS = [
  "https://daemun.org",
  "https://www.daemun.org",
  "https://daemun-web.vercel.app",
];

/** Explicit aliases only: arbitrary preview domains are not implicitly trusted. */
export function telemetryOrigins(
  applicationUrls: string[],
  additionalOrigins: string,
  isProd: boolean,
): string[] {
  const values = [...PUBLIC_SITE_ORIGINS, ...applicationUrls, ...additionalOrigins.split(",")];
  return [...new Set(values.flatMap((value) => {
    try {
      const url = new URL(value.trim());
      if (url.username || url.password) return [];
      if (url.protocol !== "https:" && (isProd || url.protocol !== "http:")) return [];
      return [url.origin];
    } catch { return []; }
  }))];
}
