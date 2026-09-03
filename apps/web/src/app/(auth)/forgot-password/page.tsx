"use client";

import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthFootnote,
  AuthInput,
  AuthLink,
  AuthTitle,
  ErrorBox,
  PrimaryButton,
  SuccessBox,
} from "@/components/auth/auth-ui";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // The API answers the same way whether or not the address exists, so
      // this screen can't be used to check who has an account.
      const { error: err } = await authClient.requestPasswordReset({ email });
      if (err) {
        setError(err.message ?? "Couldn't send the email. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't reach the server. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <AuthTitle>Reset password</AuthTitle>

      {sent ? (
        <div className="flex flex-col gap-4">
          <SuccessBox>
            If an account exists for <strong>{email}</strong>, a reset link is on its way. It
            is valid for one hour.
          </SuccessBox>
          <AuthFootnote>
            <AuthLink href="/login">Back to sign in</AuthLink>
          </AuthFootnote>
        </div>
      ) : (
        <>
          <p className="-mt-4 mb-6 text-[15px] leading-relaxed text-muted">
            Enter the email you registered with and we&apos;ll send you a link to choose a new
            password.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <AuthInput
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <PrimaryButton pending={pending}>Send reset link</PrimaryButton>
          </form>

          <div className="mt-14">
            <AuthFootnote>
              Remembered it? <AuthLink href="/login">Sign in</AuthLink>
            </AuthFootnote>
          </div>
        </>
      )}
    </AuthShell>
  );
}
