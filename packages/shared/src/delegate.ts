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

/** What the onboarding writes through `authClient.updateUser`. */
export const delegateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  grade: gradeSchema,
  /** committee slug (see `committeeSchema.slug`) */
  committee: z.string().trim().min(1),
  munExperience: munExperienceSchema,
});
export type DelegateProfile = z.infer<typeof delegateProfileSchema>;

/** Every field is nullable on the user row until onboarding completes. */
export function isProfileComplete(u: {
  name?: string | null;
  grade?: string | null;
  committee?: string | null;
  munExperience?: string | null;
}): boolean {
  return Boolean(u.name && u.grade && u.committee && u.munExperience);
}

export const userRoleSchema = z.enum(["admin", "delegate"]);
export type UserRole = z.infer<typeof userRoleSchema>;
