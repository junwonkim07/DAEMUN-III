import { createMiddleware } from "hono/factory";
import { auth, type Session } from "../auth";

export type AuthEnv = {
  Variables: { session: Session };
};

/** Reject unless the request carries a valid session for a non-banned admin. */
export const requireAdmin = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.banned) return c.json({ error: "Account is banned" }, 403);
  if (session.user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  c.set("session", session);
  await next();
});

/** Reject unless the request carries a valid session for any non-banned user. */
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) return c.json({ error: "Unauthorized" }, 401);
  if (session.user.banned) return c.json({ error: "Account is banned" }, 403);

  c.set("session", session);
  await next();
});
