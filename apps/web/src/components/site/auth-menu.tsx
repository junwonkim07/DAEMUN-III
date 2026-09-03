"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Right-hand end of the navbar: "Log in" when signed out, the delegate's
 * name with a small menu (My page / Log out) when signed in.
 */
export function AuthMenu({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const logout = async () => {
    setSigningOut(true);
    await signOut();
    setOpen(false);
    setSigningOut(false);
    onNavigate?.();
    router.push("/");
    router.refresh();
  };

  if (isPending) {
    return <span className="inline-block h-8 w-[74px] rounded-full bg-black/5" aria-hidden />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="inline-flex h-8 items-center rounded-full border border-ink/80 px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-white"
      >
        Log in
      </Link>
    );
  }

  const name = session.user.name?.trim() || session.user.email;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex h-8 max-w-[180px] items-center gap-2 rounded-full border border-ink/15 bg-white pl-1.5 pr-3 text-[13px] text-ink transition-colors hover:border-ink/40"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-navy text-white">
          <UserRound className="size-3" />
        </span>
        <span className="truncate">{name}</span>
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {/* Touch devices have no hover — tap anywhere outside to close. */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 cursor-default"
        />
      )}

      <div
        className={cn(
          "absolute right-0 top-full z-30 w-52 pt-2 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white py-1.5 shadow-[0_10px_30px_rgba(10,20,40,0.12)]">
          <div className="px-4 pb-2 pt-1.5">
            <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
            <p className="truncate text-[12px] text-muted">{session.user.email}</p>
          </div>
          <div className="my-1 h-px bg-black/8" />
          <Link
            href="/account"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-ink hover:bg-wash"
          >
            <UserRound className="size-4 text-muted" />
            My page
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink hover:bg-wash disabled:opacity-60"
          >
            <LogOut className="size-4 text-muted" />
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
