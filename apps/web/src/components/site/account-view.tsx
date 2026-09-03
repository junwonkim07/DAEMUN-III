"use client";

import { Award, GraduationCap, Landmark, Loader2, LogOut, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut, useSession } from "@/lib/auth-client";
import { GRADE_OPTIONS, MUN_EXPERIENCE_OPTIONS, isProfileComplete } from "@daemun/shared";

export type CommitteeSummary = { slug: string; code: string; name: string };

/** /account — the delegate's own profile, "Edit details", and "Log out". */
export function AccountView({ committees }: { committees: CommitteeSummary[] }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Not signed in → go log in. Skipped while *we* are signing out, so the
    // explicit redirect to "/" below wins.
    if (!isPending && !session && !signingOut) router.replace("/login?next=/account");
  }, [isPending, session, signingOut, router]);

  if (!session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  const u = session.user;
  const committee = committees.find((c) => c.slug === u.committee);
  const grade = GRADE_OPTIONS.find((g) => g.value === u.grade);
  const experience = MUN_EXPERIENCE_OPTIONS.find((e) => e.value === u.munExperience);
  const complete = isProfileComplete(u);

  const logout = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="font-roman text-[11px] uppercase tracking-[0.28em] text-faint">My page</p>
      <h1 className="font-custom mt-3 text-[44px] font-semibold leading-none tracking-[0.02em] text-ink sm:text-[56px]">
        {u.name?.trim() || "Delegate"}
      </h1>
      <p className="mt-3 flex items-center gap-2 text-[15px] text-muted">
        <Mail className="size-4" />
        {u.email}
        {u.role === "admin" && (
          <span className="ml-2 rounded-full bg-navy px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white">
            Secretariat
          </span>
        )}
      </p>

      {!complete && (
        <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-gold/40 bg-[#fbf8f1] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[16px] font-semibold text-ink">Your profile is incomplete</p>
            <p className="mt-1 text-[14px] text-muted">
              Tell us your grade, committee and MUN experience so the Secretariat can prepare.
            </p>
          </div>
          <Link
            href="/account/welcome?edit=1"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-navy px-5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Complete profile
          </Link>
        </div>
      )}

      <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        <Row icon={<UserRound className="size-5" />} label="Name" value={u.name?.trim() || "—"} />
        <Row icon={<GraduationCap className="size-5" />} label="Grade" value={grade?.label ?? "—"} />
        <Row
          icon={<Landmark className="size-5" />}
          label="Committee"
          value={committee ? `${committee.code} · ${committee.name}` : "—"}
        />
        <Row icon={<Award className="size-5" />} label="MUN experience" value={experience?.label ?? "—"} />
      </dl>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/account/welcome?edit=1"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-ink/80 px-5 text-[14px] font-medium text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Edit details
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={signingOut}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          <LogOut className="size-4" />
          {signingOut ? "Logging out…" : "Log out"}
        </button>
      </div>

      <p className="mt-16 max-w-[52ch] text-[13px] leading-relaxed text-faint">
        Resolution submission for your committee will open here closer to the conference. Until
        then, check the{" "}
        <Link href="/guide" className="text-brand hover:opacity-75">
          Guide to MUN
        </Link>{" "}
        and your committee&apos;s chair report.
      </p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 bg-white px-6 py-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wash text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-[0.2em] text-faint">{label}</dt>
        <dd className="mt-0.5 truncate text-[16px] font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}
