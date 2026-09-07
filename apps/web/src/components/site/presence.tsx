"use client";

import { useEffect } from "react";

import { uuid } from "@/lib/uuid";

const BEAT_MS = 45_000;

/**
 * Anonymous "I'm here" heartbeat for the admin overview's online counter.
 * A random id per tab (sessionStorage) is posted every 45 s while the tab is
 * visible. No cookies, no account, no IP is stored server-side.
 */
export function Presence() {
  useEffect(() => {
    // Nothing in here may throw: an uncaught error in an effect unmounts the
    // whole React root, and a visitor counter must never be able to do that.
    // (It did, once — see lib/uuid.ts.)
    try {
      let id: string;
      try {
        id = sessionStorage.getItem("daemun-presence") ?? uuid();
        sessionStorage.setItem("daemun-presence", id);
      } catch {
        // sessionStorage can be blocked (private mode, storage disabled)
        id = uuid();
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
    } catch (err) {
      console.warn("[presence] disabled:", (err as Error).message);
      return;
    }
  }, []);

  return null;
}
