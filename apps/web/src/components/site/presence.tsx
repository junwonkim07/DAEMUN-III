"use client";

import { useEffect } from "react";

const BEAT_MS = 45_000;

/**
 * Anonymous "I'm here" heartbeat for the admin overview's online counter.
 * A random id per tab (sessionStorage) is posted every 45 s while the tab is
 * visible. No cookies, no account, no IP is stored server-side.
 */
export function Presence() {
  useEffect(() => {
    let id: string;
    try {
      id = sessionStorage.getItem("daemun-presence") ?? crypto.randomUUID();
      sessionStorage.setItem("daemun-presence", id);
    } catch {
      id = crypto.randomUUID();
    }

    const beat = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
        keepalive: true,
      }).catch(() => {});
    };

    beat();
    const timer = setInterval(beat, BEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);

  return null;
}
