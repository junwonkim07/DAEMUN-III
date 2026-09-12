// apps/admin/src/lib/announcements.ts
"use client";

import type { z } from "zod";
import type {
  Announcement,
  announcementCreateSchema,
  announcementUpdateSchema,
} from "@daemun/shared";
import { makeResourceHooks } from "./crud-hooks";

export type AnnouncementCreate = z.input<typeof announcementCreateSchema>;
export type AnnouncementPatch = z.input<typeof announcementUpdateSchema>;

// Announcements are part of SiteData, so the list comes from useSite() and
// mutations invalidate SITE_KEY — same as documents/schedule.
export const announcementHooks = makeResourceHooks<
  Announcement,
  AnnouncementCreate,
  AnnouncementPatch
>("/announcements");
