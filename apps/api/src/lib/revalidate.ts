import { waitUntil } from "@vercel/functions";
import { env } from "../env";

/**
 * Tell the public site its cached data is stale. Failures are logged, never
 * surfaced to the admin request.
 *
 * The call is handed to `waitUntil` so a serverless runtime keeps the
 * instance alive until it finishes — without that, the response is sent,
 * the instance is frozen, and the webhook silently never fires. Off Vercel
 * `waitUntil` is a no-op (`getContext().waitUntil?.()`), and the promise
 * simply runs to completion inside the long-lived process.
 *
 * This used to debounce with a 300 ms setTimeout so a burst of admin edits
 * produced one webhook. That timer lived in module state, which a serverless
 * instance neither shares nor survives past the response; and revalidateTag
 * is idempotent, so a few extra POSTs during a burst cost nothing.
 */
export function revalidateWeb() {
  if (!env.revalidateSecret) return;
  waitUntil(
    fetch(`${env.webUrl}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": env.revalidateSecret },
    })
      .then((res) => {
        if (!res.ok) console.warn(`[revalidate] web responded ${res.status}`);
      })
      .catch((err) => {
        console.warn("[revalidate] failed:", (err as Error).message);
      }),
  );
}
