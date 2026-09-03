"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Text / password input (pill, grey fill — matches the reference)    */
/* ------------------------------------------------------------------ */

export function AuthInput({
  className,
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={props.id ?? id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        placeholder={label}
        {...props}
        className={cn(
          "h-[52px] w-full rounded-xl bg-[#f1f1f0] px-5 text-[15px] text-ink outline-none transition-shadow placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40",
          className,
        )}
      />
    </div>
  );
}

export function PasswordInput({
  className,
  label = "Password",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={shown ? "text" : "password"}
        placeholder={label}
        {...props}
        className={cn(
          "h-[52px] w-full rounded-xl bg-[#f1f1f0] pl-5 pr-12 text-[15px] text-ink outline-none transition-shadow placeholder:text-muted/70 focus:ring-2 focus:ring-brand/40",
          className,
        )}
      />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/70 transition-colors hover:text-ink"
      >
        {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Buttons                                                            */
/* ------------------------------------------------------------------ */

export function PrimaryButton({
  className,
  pending,
  children,
  ...props
}: ComponentProps<"button"> & { pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      {...props}
      className={cn(
        "flex h-[52px] w-full items-center justify-center rounded-xl bg-navy text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-70",
        className,
      )}
    >
      {pending ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-[#fdf1f1] px-5 py-3.5 text-[15px] text-[#c62828]"
    >
      {children}
    </p>
  );
}

export function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-xl bg-[#eef6ee] px-5 py-3.5 text-[15px] text-[#2e7d32]">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Typography helpers                                                 */
/* ------------------------------------------------------------------ */

export function AuthTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-custom mb-9 text-[44px] font-semibold leading-none tracking-[0.02em] text-ink">
      {children}
    </h1>
  );
}

export function AuthLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("font-medium text-brand transition-opacity hover:opacity-75", className)}
    >
      {children}
    </Link>
  );
}

/** "No account? Sign up" style footer line. */
export function AuthFootnote({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-[15px] text-body">{children}</p>;
}
