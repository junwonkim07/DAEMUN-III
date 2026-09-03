"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthFootnote,
  AuthLink,
  AuthTitle,
  ErrorBox,
  PasswordInput,
  PrimaryButton,
} from "@/components/auth/auth-ui";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setPending(true);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) {
        setError(authErrorMessage(err));
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError("We couldn't reach the server. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <>
        <AuthTitle>Reset password</AuthTitle>
        <ErrorBox>This link is missing its token. Please request a new one.</ErrorBox>
        <div className="mt-8">
          <AuthFootnote>
            <AuthLink href="/forgot-password">Request a new link</AuthLink>
          </AuthFootnote>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthTitle>Choose a new password</AuthTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <PasswordInput
          label="New password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          label="Confirm new password"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton pending={pending}>Update password</PrimaryButton>
      </form>

      <div className="mt-14">
        <AuthFootnote>
          <AuthLink href="/login">Back to sign in</AuthLink>
        </AuthFootnote>
      </div>
    </>
  );
}
