"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthFootnote,
  AuthInput,
  AuthLink,
  AuthTitle,
  ErrorBox,
  PasswordInput,
  PrimaryButton,
  SuccessBox,
} from "@/components/auth/auth-ui";
import { authErrorMessage, signIn } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const notice = params.get("reset") === "1" ? "Your password has been updated. Sign in to continue." : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setPending(true);
    try {
      const { error: err } = await signIn.email({ email, password });
      if (err) {
        if (err.code === "EMAIL_NOT_VERIFIED") setUnverified(true);
        setError(authErrorMessage(err));
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthTitle>Sign in</AuthTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        {notice && !error && <SuccessBox>{notice}</SuccessBox>}

        <AuthInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <ErrorBox>
            {error}
            {unverified && (
              <>
                {" "}
                <AuthLink href={`/check-email?email=${encodeURIComponent(email)}`}>
                  Resend the link
                </AuthLink>
              </>
            )}
          </ErrorBox>
        )}

        <PrimaryButton pending={pending}>Sign in</PrimaryButton>
      </form>

      <div className="mt-14 flex flex-col gap-3">
        <AuthFootnote>
          <AuthLink href="/forgot-password">Forgot password?</AuthLink>
        </AuthFootnote>
        <AuthFootnote>
          No account? <AuthLink href="/signup">Sign up</AuthLink>
        </AuthFootnote>
      </div>
    </>
  );
}

/** Only allow same-site relative paths as the post-login destination. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
