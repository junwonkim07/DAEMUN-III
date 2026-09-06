"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary (Next App Router). Catches render/effect errors
 * inside a page so one broken component shows this panel instead of blanking
 * the whole site — which is exactly what happened when a client-only API was
 * missing on the plain-HTTP deployment.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-roman text-[11px] uppercase tracking-[0.28em] text-faint">
        Something went wrong
      </p>
      <h1 className="font-custom mt-3 text-[40px] font-semibold leading-none tracking-[0.02em] text-ink">
        This page hit an error
      </h1>
      <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-muted">
        The rest of the site still works. You can try this page again, or head back to the
        homepage.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-faint">ref {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-navy px-5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-ink/80 px-5 text-[14px] font-medium text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
