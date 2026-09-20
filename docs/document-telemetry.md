# Document diagnostics

The public web app records document link clicks, HEAD probe results, user-submitted document outcomes and sanitized application errors in the existing Neon PostgreSQL database (`telemetry_events`). Sentry receives sanitized Next.js browser/server errors; their event IDs and summaries are mirrored to Neon. Sentry's own issue storage remains in Sentry, not in Neon. Session Replay, form contents, credentials, request bodies, cookies and user identity are not collected.

The anonymous reference is scoped to a browser tab using sessionStorage (memory fallback). Records contain server receipt time, client occurrence time, page/document path without queries, user-agent, release, event type, probe headers/status/duration and optional Sentry ID. Browser reports are untrusted client submissions and labelled separately from server errors.

## Using it

- Guide → Documents → “Having trouble opening a document?” opens the check/report controls.
- `/diagnostics` is a shareable help page. Ask the reporter to run a link check, submit what happened and send the displayed reference plus the Microsoft error URL/screenshot separately.
- Admin → Telemetry (`/dashboard/telemetry`) lists recent records; filter by reference/session or event type. Admin authentication is required.
- A successful HEAD request proves reachability and shows response headers. It does **not** prove that the body downloaded, that the browser saved a file, or that Microsoft Office Viewer rendered it. If navigation unloads the page, the automatic probe can be missing even when the click beacon arrived. Cross-origin CORS errors are probe limitations, not proof of a broken file.
- Our script cannot observe an external Microsoft viewer page. Correlate the reporter's timestamp, browser and screenshot with the recorded events. Do not treat an absence of records as proof that no error occurred; connectivity, blockers and rate limiting can prevent delivery.

## Deployment

1. API production builds apply the additive Drizzle migration before serving new code. Confirm migration `0011_charming_psynapse` is present.
2. Set the same private `TELEMETRY_INGEST_SECRET` on the API and web projects. It authenticates server-to-server error summaries; it is never a `NEXT_PUBLIC` value.
3. Set `NEXT_PUBLIC_SENTRY_DSN` on the web project. Optional `SENTRY_ORG`, `SENTRY_PROJECT` and build-only `SENTRY_AUTH_TOKEN` enable source-map upload. Never commit environment files. The web build includes Vercel environment and git commit as release metadata.
4. Public ingestion accepts the configured web/admin origins, the known DAEMUN production aliases, and optional exact origins in `TELEMETRY_ALLOWED_ORIGINS`. Preview/local origins must be explicitly allowed when testing across servers.
5. Deploy API before web, then admin. Open the production diagnostics page and submit a clearly labelled verification report. Confirm the same event ID/reference exists in Neon and, for a warning/error report, in Sentry. Only then describe collection as enabled.

## Storage and limits

- Public/internal payloads: at most 10 strict-schema events and 12 KiB. Query strings, arbitrary extra fields and stack/request bodies are rejected. Free text is bounded and redacted again before storage.
- Public requests have a coarse ceiling of 600/minute per transient client key (shared school IPs), plus 60/minute per validated anonymous session. Every distinct session in a batch is charged once; null-session reports use only the coarse ceiling. Internal requests remain limited to 120/minute per transient client key. These in-memory limits are per API instance, **not** global quotas across serverless instances.
- Writes are awaited; report UI says saved only after an API acknowledgement. UUID event IDs prevent duplicate inserts.
- The admin API excludes records older than 30 days. Old rows are deleted opportunistically during writes, at most hourly per instance. No independent scheduled cleanup is configured; data can remain physically stored until the next successful cleanup.
- Sentry is optional at runtime: without a DSN, browser/render errors still use Neon when ingestion is reachable. Monitoring failures must not change document navigation or expose details in public error responses.

## Verification

`pnpm -r test`, `pnpm -r typecheck`, `pnpm -r lint`, and `API_URL=<api-origin> pnpm -r build`. Ingestion tests cover origin/secret enforcement, payload bounds, privacy, persistence failure and idempotency. Web tests cover session correlation, probes, acknowledgement failures and Sentry scrubbing. Live checks must also verify the authenticated admin view and actual production database delivery.
