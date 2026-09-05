"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  CornerDownLeft,
  Crown,
  GraduationCap,
  Landmark,
  Loader2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/auth/auth-shell";
import { OptionCard } from "@/components/auth/option-card";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS, MUN_EXPERIENCE_OPTIONS, TEAM_ROLE_OPTIONS } from "@daemun/shared";

export type CommitteeOption = {
  slug: string;
  code: string;
  name: string;
  image: string | null;
};

type Form = {
  name: string;
  grade: string | null;
  committee: string | null;
  munExperience: string | null;
  teamRole: string | null;
};

const STEPS = ["name", "grade", "committee", "experience", "teamRole", "done"] as const;
type Step = (typeof STEPS)[number];

const TEAM_ROLE_ICONS = [<Crown key="lead" className="size-6" />, <Users key="member" className="size-6" />];

const EXPERIENCE_ICONS = [
  <Sparkles key="0" className="size-6" />,
  <Star key="1" className="size-6" />,
  <Award key="2" className="size-6" />,
  <Users key="3" className="size-6" />,
];

/**
 * Multi-step delegate profile flow shown right after email confirmation
 * (/account/welcome) and again from "Edit details" on the account page.
 * Every step can be skipped; answers are saved once at the end.
 */
export function Onboarding({
  committees,
  mode,
}: {
  committees: CommitteeOption[];
  mode: "welcome" | "edit";
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the session once it arrives (edit mode, or a returning user).
  if (session && form === null) {
    const u = session.user;
    // Sign-up stores the email's local part as a placeholder name; don't
    // present that as if it were the delegate's real name.
    const placeholder = u.email.split("@")[0] ?? "";
    setForm({
      name: u.name && u.name !== placeholder ? u.name : "",
      grade: u.grade ?? null,
      committee: u.committee ?? null,
      munExperience: u.munExperience ?? null,
      teamRole: u.teamRole ?? null,
    });
  }

  useEffect(() => {
    if (!isPending && !session) router.replace("/login?next=/account/welcome");
  }, [isPending, session, router]);

  const step: Step = STEPS[stepIndex]!;

  const answered =
    form === null
      ? false
      : step === "name"
        ? form.name.trim().length > 0
        : step === "grade"
          ? form.grade !== null
          : step === "committee"
            ? form.committee !== null
            : step === "experience"
              ? form.munExperience !== null
              : step === "teamRole"
                ? form.teamRole !== null
                : true;

  const go = (delta: number) => {
    setDirection(delta);
    setStepIndex((i) => Math.min(Math.max(i + delta, 0), STEPS.length - 1));
  };

  const finish = async () => {
    if (!form || saving) return;
    setSaving(true);
    setError(null);
    const patch: Partial<Form> = {};
    if (form.name.trim()) patch.name = form.name.trim();
    if (form.grade) patch.grade = form.grade;
    if (form.committee) patch.committee = form.committee;
    if (form.munExperience) patch.munExperience = form.munExperience;
    if (form.teamRole) patch.teamRole = form.teamRole;

    if (Object.keys(patch).length > 0) {
      const { error: err } = await authClient.updateUser(patch);
      if (err) {
        setError(err.message ?? "Could not save your details. Please try again.");
        setSaving(false);
        return;
      }
    }
    router.push(mode === "edit" ? "/account" : "/");
    router.refresh();
  };

  const next = () => {
    if (step === "done") void finish();
    else go(1);
  };

  const back = () => {
    if (stepIndex === 0) {
      if (mode === "edit") router.push("/account");
      return;
    }
    go(-1);
  };

  // Enter advances — mirrors the "Continue ↵" hint on the button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA") return;
      // Let real buttons (Back / Continue) activate natively; option cards
      // are buttons too but act as radios, so Enter should advance instead.
      if (target?.tagName === "BUTTON" && !/^(radio|checkbox)$/.test(target.getAttribute("role") ?? "")) {
        return;
      }
      e.preventDefault();
      next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!form) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  const firstName = form.name.trim().split(/\s+/)[0] || "delegate";
  const committee = committees.find((c) => c.slug === form.committee);
  const grade = GRADE_OPTIONS.find((g) => g.value === form.grade);
  const experience = MUN_EXPERIENCE_OPTIONS.find((e) => e.value === form.munExperience);
  const teamRole = TEAM_ROLE_OPTIONS.find((r) => r.value === form.teamRole);

  return (
    <div className="flex flex-1 flex-col">
      <header className="px-6 pt-6 sm:px-10">
        <BrandMark />
      </header>

      <div className="flex flex-1 flex-col items-center px-6 pb-36 pt-10 sm:pt-16">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -28 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-[520px]"
          >
            {step === "name" && (
              <StepFrame
                title={
                  mode === "edit" ? (
                    <>What should we call you?</>
                  ) : (
                    <>
                      Welcome, delegate.
                      <br />
                      What&apos;s your name?
                    </>
                  )
                }
                sub="Use the name that appears on your school registration."
              >
                <input
                  autoFocus
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="h-[60px] w-full rounded-2xl border border-line bg-white px-6 text-[19px] text-ink outline-none transition-all placeholder:text-muted/60 focus:border-brand focus:shadow-[0_0_0_1px_#0c4884]"
                />
              </StepFrame>
            )}

            {step === "grade" && (
              <StepFrame
                title={
                  <>
                    Hey {firstName}!
                    <br />
                    Which grade are you in?
                  </>
                }
                sub="This helps the Secretariat organise committees."
              >
                {GRADE_OPTIONS.map((g) => (
                  <OptionCard
                    key={g.value}
                    icon={<GraduationCap className="size-6" />}
                    label={g.label}
                    sub={g.sub}
                    selected={form.grade === g.value}
                    onSelect={() => setForm({ ...form, grade: g.value })}
                  />
                ))}
              </StepFrame>
            )}

            {step === "committee" && (
              <StepFrame
                title={
                  <>
                    Which committee
                    <br />
                    are you in?
                  </>
                }
                sub="Pick the council you were assigned to. You can change this later."
              >
                {committees.map((c) => (
                  <OptionCard
                    key={c.slug}
                    icon={
                      c.image ? (
                        <Image
                          src={c.image}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 rounded-md object-cover"
                        />
                      ) : (
                        <Landmark className="size-6" />
                      )
                    }
                    label={c.code}
                    sub={c.name}
                    selected={form.committee === c.slug}
                    onSelect={() => setForm({ ...form, committee: c.slug })}
                  />
                ))}
              </StepFrame>
            )}

            {step === "experience" && (
              <StepFrame
                title={
                  <>
                    How much MUN
                    <br />
                    experience do you have?
                  </>
                }
                sub="Chairs use this to pace debate and offer guidance where it helps."
              >
                {MUN_EXPERIENCE_OPTIONS.map((e, i) => (
                  <OptionCard
                    key={e.value}
                    icon={EXPERIENCE_ICONS[i]}
                    label={e.label}
                    sub={e.sub}
                    selected={form.munExperience === e.value}
                    onSelect={() => setForm({ ...form, munExperience: e.value })}
                  />
                ))}
              </StepFrame>
            )}

            {step === "teamRole" && (
              <StepFrame
                title={
                  <>
                    When your team forms,
                    <br />
                    what&apos;s your role?
                  </>
                }
                sub="Your team is assigned by the Secretariat after sign-up. This just tells them who to make the submitter — more than one person can pick lead."
              >
                {TEAM_ROLE_OPTIONS.map((r, i) => (
                  <OptionCard
                    key={r.value}
                    icon={TEAM_ROLE_ICONS[i]}
                    label={r.label}
                    sub={r.sub}
                    selected={form.teamRole === r.value}
                    onSelect={() => setForm({ ...form, teamRole: r.value })}
                  />
                ))}
              </StepFrame>
            )}

            {step === "done" && (
              <div className="flex flex-col items-center text-center">
                <Image
                  src="/emblem-navy.png"
                  alt=""
                  width={88}
                  height={66}
                  className="mb-8"
                  priority
                />
                <h1 className="font-custom text-[40px] font-semibold leading-[1.1] tracking-[0.02em] text-ink sm:text-[44px]">
                  You&apos;re all set,
                  <br />
                  <span className="text-brand">{firstName}</span>
                </h1>
                <p className="mt-5 text-[16px] text-muted">
                  {mode === "edit"
                    ? "Review your details, then continue to save."
                    : "Your delegate profile is ready. See you in November."}
                </p>

                <dl className="mt-12 flex w-full max-w-[320px] flex-col gap-5 text-left">
                  <SummaryRow
                    icon={<Landmark className="size-5" />}
                    label="Committee"
                    value={committee ? `${committee.code} · ${committee.name}` : "Not chosen"}
                  />
                  <SummaryRow
                    icon={<GraduationCap className="size-5" />}
                    label="Grade"
                    value={grade?.label ?? "Not chosen"}
                  />
                  <SummaryRow
                    icon={<Award className="size-5" />}
                    label="Experience"
                    value={experience?.label ?? "Not chosen"}
                  />
                  <SummaryRow
                    icon={<Crown className="size-5" />}
                    label="Team role"
                    value={teamRole?.label ?? "Not chosen"}
                  />
                </dl>

                {error && (
                  <p role="alert" className="mt-8 rounded-xl bg-[#fdf1f1] px-5 py-3 text-[14px] text-[#c62828]">
                    {error}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ---- Bottom bar ---- */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white">
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0 && mode !== "edit"}
            className="rounded-xl bg-[#f1f1f0] px-5 py-3 text-[15px] font-medium text-ink transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            Back
          </button>

          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] text-faint sm:block">
              {step === "done" ? "" : `${stepIndex + 1} / ${STEPS.length - 1}`}
            </span>
            <button
              type="button"
              onClick={next}
              disabled={saving}
              className={cn(
                "flex h-12 items-center gap-2.5 rounded-xl px-5 text-[15px] font-medium text-white transition-all",
                answered ? "bg-brand hover:opacity-90" : "bg-brand/90 hover:opacity-90",
                saving && "opacity-70",
              )}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : answered ? (
                <>
                  Continue
                  <span className="flex size-6 items-center justify-center rounded-md bg-white/20">
                    <CornerDownLeft className="size-3.5" />
                  </span>
                </>
              ) : (
                "Skip"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFrame({
  title,
  sub,
  children,
}: {
  title: React.ReactNode;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <h1 className="font-custom text-center text-[34px] font-semibold leading-[1.12] tracking-[0.02em] text-ink sm:text-[40px]">
        {title}
      </h1>
      <p className="mt-5 max-w-[36ch] text-center text-[16px] leading-relaxed text-muted">{sub}</p>
      <div className="mt-12 flex w-full flex-col gap-3.5">{children}</div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center text-faint">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-[11px] uppercase tracking-[0.2em] text-faint">{label}</dt>
        <dd className="truncate text-[16px] font-semibold text-ink">{value}</dd>
      </div>
    </div>
  );
}
