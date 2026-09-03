import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

/**
 * better-auth client for the public site.
 *
 * next.config.ts rewrites `/api/auth/*` to the API server, so the client
 * talks same-origin and the session cookie is a first-party cookie of the
 * site. (API side: `WEB_PUBLIC_URL` must be this origin — see apps/api/src/auth.ts.)
 *
 * The additional fields mirror `user.additionalFields` in the API auth config
 * and the delegate-profile columns on the `user` table.
 */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false, input: false },
        grade: { type: "string", required: false },
        committee: { type: "string", required: false },
        munExperience: { type: "string", required: false },
      },
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;

export type SessionUser = NonNullable<
  ReturnType<typeof useSession>["data"]
>["user"];

/** Human-readable message for a better-auth error payload. */
export function authErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "USER_NOT_FOUND":
      return "Incorrect email or password.";
    case "EMAIL_NOT_VERIFIED":
      return "Please confirm your email address first.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists.";
    case "PASSWORD_TOO_SHORT":
      return "Password must be at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Password is too long.";
    case "INVALID_EMAIL":
      return "Please enter a valid email address.";
    case "INVALID_TOKEN":
      return "This link is invalid or has already been used.";
    case "TOKEN_EXPIRED":
      return "This link has expired. Please request a new one.";
    default:
      return error?.message || fallback;
  }
}
