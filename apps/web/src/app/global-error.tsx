"use client";

import { useEffect } from "react";

/**
 * Root error boundary (Next App Router). Only reached when the root layout
 * itself fails; it replaces the layout, so it must render its own <html> and
 * <body> and cannot rely on globals.css. Kept deliberately plain.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] root error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#12171f",
          background: "#ffffff",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8a8f99" }}>
            DAEMUN III
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 600, margin: "12px 0 0", lineHeight: 1.1 }}>
            The site hit an error
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#5e6673", margin: "20px 0 0" }}>
            Please reload the page. If it keeps happening, the Secretariat can be reached through
            the contact details on the homepage.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#8a8f99", fontFamily: "monospace", margin: "12px 0 0" }}>
              ref {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 32,
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: 0,
              background: "#0a1428",
              color: "#ffffff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
