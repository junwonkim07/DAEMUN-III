import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  Shared column helpers                                              */
/* ------------------------------------------------------------------ */

const id = () => text("id").primaryKey();
const sortOrder = () => integer("sort_order").notNull().default(0);
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/*  Conference (single row, id = "main")                               */
/* ------------------------------------------------------------------ */

export const conference = pgTable("conference", {
  id: id(),
  name: text("name").notNull(),
  org: text("org").notNull(),
  theme: text("theme").notNull().default(""),
  session: text("session").notNull().default(""),
  dates: text("dates").notNull().default("TBA"),
  venue: text("venue").notNull().default("TBA"),
  email: text("email").notNull().default("TBA"),
  instagram: text("instagram").notNull().default("TBA"),
  instagramUrl: text("instagram_url").notNull().default("#"),
  address: text("address").notNull().default("TBA"),
  firstHeld: text("first_held").notNull().default(""),
  aboutLead: text("about_lead").notNull().default(""),
  aboutBody: text("about_body").notNull().default(""),
  themeLead: text("theme_lead").notNull().default(""),
  themeBody: text("theme_body").notNull().default(""),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Committees & topics                                                */
/* ------------------------------------------------------------------ */

export const committees = pgTable("committees", {
  id: id(),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  image: text("image"),
  sourceLabel: text("source_label"),
  sourceUrl: text("source_url"),
  sortOrder: sortOrder(),
  ...timestamps,
});

export const topics = pgTable("topics", {
  id: id(),
  committeeId: text("committee_id")
    .notNull()
    .references(() => committees.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("TBA"),
  summary: text("summary").notNull().default(""),
  report: text("report"),
  sortOrder: sortOrder(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Secretariat                                                        */
/* ------------------------------------------------------------------ */

export const departments = pgTable("departments", {
  id: id(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull().default(""),
  sortOrder: sortOrder(),
  ...timestamps,
});

export const personSection = pgEnum("person_section", [
  "director",
  "executive",
  "department",
  "chair",
]);

export const people = pgTable("people", {
  id: id(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  photo: text("photo"),
  greeting: text("greeting"),
  section: personSection("section").notNull(),
  departmentId: text("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  committeeId: text("committee_id").references(() => committees.id, {
    onDelete: "set null",
  }),
  sortOrder: sortOrder(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Resolutions                                                        */
/* ------------------------------------------------------------------ */

export const resolutionStatus = pgEnum("resolution_status", [
  "approved",
  "review",
  "awaiting",
]);

export const resolutions = pgTable("resolutions", {
  id: id(),
  committeeId: text("committee_id")
    .notNull()
    .references(() => committees.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
  submitter: text("submitter").notNull().default(""),
  status: resolutionStatus("status").notNull().default("awaiting"),
  document: text("document"),
  sortOrder: sortOrder(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Schedule                                                           */
/* ------------------------------------------------------------------ */

export const scheduleDays = pgTable("schedule_days", {
  id: id(),
  day: text("day").notNull(),
  date: text("date").notNull().default("TBA"),
  sortOrder: sortOrder(),
  ...timestamps,
});

export const scheduleItems = pgTable("schedule_items", {
  id: id(),
  dayId: text("day_id")
    .notNull()
    .references(() => scheduleDays.id, { onDelete: "cascade" }),
  time: text("time").notNull().default("TBA"),
  event: text("event").notNull(),
  sortOrder: sortOrder(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Documents                                                          */
/* ------------------------------------------------------------------ */

export const documents = pgTable("documents", {
  id: id(),
  title: text("title").notNull(),
  blurb: text("blurb").notNull().default(""),
  file: text("file").notNull(),
  kind: text("kind").notNull().default("PDF"),
  size: text("size").notNull().default(""),
  sortOrder: sortOrder(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Auth (better-auth core + admin plugin)                             */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // admin plugin
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  // delegate profile (collected by the sign-up onboarding on the public site)
  grade: text("grade"),
  committee: text("committee"),
  munExperience: text("mun_experience"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // admin plugin
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  issuer: text("issuer").notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Relations (for db.query.*)                                         */
/* ------------------------------------------------------------------ */

export const committeesRelations = relations(committees, ({ many }) => ({
  topics: many(topics),
  chairs: many(people),
  resolutions: many(resolutions),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  committee: one(committees, {
    fields: [topics.committeeId],
    references: [committees.id],
  }),
  resolutions: many(resolutions),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  members: many(people),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  department: one(departments, {
    fields: [people.departmentId],
    references: [departments.id],
  }),
  committee: one(committees, {
    fields: [people.committeeId],
    references: [committees.id],
  }),
}));

export const resolutionsRelations = relations(resolutions, ({ one }) => ({
  committee: one(committees, {
    fields: [resolutions.committeeId],
    references: [committees.id],
  }),
  topic: one(topics, {
    fields: [resolutions.topicId],
    references: [topics.id],
  }),
}));

export const scheduleDaysRelations = relations(scheduleDays, ({ many }) => ({
  items: many(scheduleItems),
}));

export const scheduleItemsRelations = relations(scheduleItems, ({ one }) => ({
  day: one(scheduleDays, {
    fields: [scheduleItems.dayId],
    references: [scheduleDays.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
