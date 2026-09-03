"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthFootnote,
  AuthInput,
  AuthLink,
  AuthTitle,
  ErrorBox,
  PasswordInput,
  PrimaryButton,
} from "@/components/auth/auth-ui";
import { authErrorMessage, signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);
    try {
      // The API requires email confirmation before sign-in, so this never
      // creates a session — it only sends the confirmation link. The name is
      // collected on the onboarding screens after confirmation.
      const { error: err } = await signUp.email({
        email,
        password,
        name: email.split("@")[0] ?? "",
      });
      if (err) {
        setError(authErrorMessage(err));
        return;
      }
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("We couldn't reach the server. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell>
      <AuthTitle>Sign up</AuthTitle>

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
        <PasswordInput
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="px-1 text-[13px] text-faint">At least 8 characters.</p>

        {error && <ErrorBox>{error}</ErrorBox>}

        <PrimaryButton pending={pending}>Sign up</PrimaryButton>
      </form>

      <div className="mt-14">
        <AuthFootnote>
          Already have an account? <AuthLink href="/login">Sign in</AuthLink>
        </AuthFootnote>
      </div>
    </AuthShell>
  );
}
