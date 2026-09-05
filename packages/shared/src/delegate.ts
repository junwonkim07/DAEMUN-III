import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Delegate profile — collected by the public site's sign-up flow     */
/*  and stored on better-auth's `user` row (additionalFields).         */
/* ------------------------------------------------------------------ */

export const GRADE_OPTIONS = [
  { value: "1", label: "Grade 10", sub: "고등학교 1학년" },
  { value: "2", label: "Grade 11", sub: "고등학교 2학년" },
  { value: "3", label: "Grade 12", sub: "고등학교 3학년" },
] as const;
export type Grade = (typeof GRADE_OPTIONS)[number]["value"];

export const MUN_EXPERIENCE_OPTIONS = [
  { value: "first", label: "This is my first conference", sub: "No prior MUN experience" },
  { value: "1-2", label: "1 – 2 conferences", sub: "I know the basics of procedure" },
  { value: "3-5", label: "3 – 5 conferences", sub: "Comfortable drafting resolutions" },
  { value: "6+", label: "6 or more conferences", sub: "Experienced delegate or chair" },
] as const;
export type MunExperience = (typeof MUN_EXPERIENCE_OPTIONS)[number]["value"];

export const gradeSchema = z.enum(["1", "2", "3"]);
export const munExperienceSchema = z.enum(["first", "1-2", "3-5", "6+"]);

/**
 * §6-1: self-declared at sign-up. This is a preference, not a grant — the
 * admin can still put anyone in either role when assigning teams, and more
 * than one delegate per team may pick "lead" (handover.md §6-1 decision C).
 */
export const TEAM_ROLE_OPTIONS = [
  { value: "lead", label: "Team lead", sub: "I'll be the one submitting our resolution" },
  { value: "member", label: "Team member", sub: "I'm drafting with a team, not submitting solo" },
] as const;
export type TeamRolePreference = (typeof TEAM_ROLE_OPTIONS)[number]["value"];
export const teamRoleSchema = z.enum(["lead", "member"]);

/** What the onboarding writes through `authClient.updateUser`. */
export const delegateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  grade: gradeSchema,
  /** committee slug (see `committeeSchema.slug`) */
  committee: z.string().trim().min(1),
  munExperience: munExperienceSchema,
  teamRole: teamRoleSchema,
});
export type DelegateProfile = z.infer<typeof delegateProfileSchema>;

/** Every field is nullable on the user row until onboarding completes. */
export function isProfileComplete(u: {
  name?: string | null;
  grade?: string | null;
  committee?: string | null;
  munExperience?: string | null;
  teamRole?: string | null;
}): boolean {
  return Boolean(u.name && u.grade && u.committee && u.munExperience && u.teamRole);
}

export const userRoleSchema = z.enum(["admin", "delegate"]);
export type UserRole = z.infer<typeof userRoleSchema>;
