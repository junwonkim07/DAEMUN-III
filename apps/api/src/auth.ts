import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { account, session, user, verification } from "@daemun/db";
import { db } from "./db";
import { env } from "./env";
import { passwordResetMail, sendMail, verificationMail } from "./lib/mail";

/**
 * Auth is mounted at `${API}/api/auth/*`.
 *
 * Two frontends talk to it, and both proxy `/api/*` to this server so the
 * session cookie stays first-party on their own origin:
 *
 *   - admin panel (`ADMIN_URL`)      — accounts with role "admin"
 *   - public site (`WEB_PUBLIC_URL`) — delegates who sign themselves up
 *
 * `baseURL` stays the admin origin (better-auth needs one); both origins are
 * trusted for CSRF / callback checks.
 *
 * Sign-up is open to delegates. New accounts get role "delegate" (NOT admin —
 * see handover.md §6-1) and must confirm their email before they can sign
 * in. Admin-issued accounts (bootstrap, `auth.admin.createUser`) skip the
 * confirmation step; see the database hook below.
 */
export const auth = betterAuth({
  baseURL: env.adminUrl,
  basePath: "/api/auth",
  secret: env.authSecret,
  trustedOrigins: Array.from(new Set([env.adminUrl, env.webPublicUrl])),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),

  user: {
    // Delegate profile, filled in by the public site's onboarding
    // (`authClient.updateUser`). Nullable until then.
    additionalFields: {
      grade: { type: "string", required: false, input: true },
      committee: { type: "string", required: false, input: true },
      munExperience: { type: "string", required: false, input: true },
      // §6-1: teamRole is self-declared at sign-up like the fields above.
      // teamId is admin-only (input: false blocks self-service updateUser;
      // it's written through PATCH /api/admin/users/:id/team instead).
      teamRole: { type: "string", required: false, input: true },
      teamId: { type: "string", required: false, input: false },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user: u, token }) => {
      const url = `${env.webPublicUrl}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail(passwordResetMail(u.email, url));
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user: u, token }) => {
      // Build the link against the *site* origin (not better-auth's baseURL,
      // which is the admin panel) so the session cookie set on verification
      // lands where the delegate actually is.
      const callback = encodeURIComponent(`${env.webPublicUrl}/account/welcome`);
      const url = `${env.webPublicUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${callback}`;
      await sendMail(verificationMail(u.email, url));
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (u) => {
          // Only the admin plugin's create-user endpoint (and bootstrap) can
          // set `role` — public sign-up cannot (`input: false`). Those
          // accounts are hand-issued, so they don't need to confirm email.
          if ((u as { role?: string }).role === "admin") {
            return { data: { ...u, emailVerified: true } };
          }
        },
      },
    },
  },

  session: {
    cookieCache: { enabled: true, maxAge: 60 },
  },

  plugins: [admin({ defaultRole: "delegate" })],
});

export type Session = typeof auth.$Infer.Session;
