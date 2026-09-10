/**
 * UUID v4 that also works on plain-HTTP origins.
 *
 * `crypto.randomUUID()` exists only in secure contexts (HTTPS or localhost).
 * The public site is currently served over http://<ip>, where it is
 * `undefined` and calling it throws — which is how the presence heartbeat once
 * took the whole page down (React unmounts the root on an uncaught effect
 * error). `crypto.getRandomValues()` is available everywhere, so fall back to
 * it. Both frontends need this, so it lives here rather than in either one.
 */

/**
 * Just the two members used below. This package compiles without the DOM lib
 * (the API imports it too), so `Crypto` is not in scope here.
 */
type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

export function uuid(): string {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    // Ancient browser — not cryptographically strong, but these ids only need
    // to be unique, never unguessable by an attacker.
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10xx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
