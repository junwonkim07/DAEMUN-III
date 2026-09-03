"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * "We sent you an email" — shown after sign-up and when someone tries to
 * sign in before confirming. Offers to resend the confirmation link.
 */
export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmail />
    </Suspense>
  );
}

function CheckEmail() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    if (!email || state === "sending") return;
    setState("sending");
    const { error } = await authClient.sendVerificationEmail({ email });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <Link
        href="/signup"
        className="absolute left-8 top-7 inline-flex items-center gap-2 text-[15px] text-ink transition-opacity hover:opacity-70"
      >
        <ArrowLeft className="size-4" />
        back
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-custom text-[42px] font-semibold leading-none tracking-[0.02em] text-ink sm:text-[48px]">
          We sent you an email
        </h1>

        <p className="mt-16 text-[17px] font-semibold text-ink">
          A confirmation link has been sent to:
        </p>
        <p className="mt-4 rounded-md bg-[#f1f1f0] px-3 py-1.5 text-[16px] text-ink">
          {email || "your email address"}
        </p>
        <p className="mt-6 max-w-[38ch] text-[14px] leading-relaxed text-muted">
          Open the link to confirm your address and finish setting up your delegate account.
          The link is valid for one hour — check your spam folder if it doesn&apos;t arrive.
        </p>

        <p className="mt-16 text-[15px] text-body">
          {state === "sent" ? (
            <span className="text-[#2e7d32]">A new link is on its way.</span>
          ) : state === "error" ? (
            <span className="text-[#c62828]">Couldn&apos;t resend right now. Please try again shortly.</span>
          ) : (
            <>
              Didn&apos;t receive it?{" "}
              <button
                type="button"
                onClick={resend}
                disabled={!email || state === "sending"}
                className="font-medium text-brand transition-opacity hover:opacity-75 disabled:opacity-50"
              >
                {state === "sending" ? "Sending…" : "Resend link"}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
