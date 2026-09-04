// apps/admin/src/components/conference/form.tsx
"use client";

import type { Conference } from "@daemun/shared";
import { ApiError } from "@/lib/api";
import { useUpdateConference } from "@/lib/conference";
import { InlineText, InlineTextarea } from "@/components/inline-edit";

type Field = keyof Conference;

const GROUPS: {
  title: string;
  hint?: string;
  fields: { key: Field; label: string; help?: string; multiline?: boolean }[];
}[] = [
  {
    title: "Basics",
    fields: [
      { key: "name", label: "Conference name", help: "e.g. DAEMUN III" },
      { key: "org", label: "Organizer", help: "e.g. Daewon Model United Nations" },
      { key: "session", label: "Session", help: "e.g. Third Session" },
      { key: "dates", label: "Dates", help: "TBA if not yet set" },
      { key: "venue", label: "Venue", help: "TBA if not yet set" },
      { key: "firstHeld", label: "First held", help: "e.g. November 2024" },
    ],
  },
  {
    title: "Contact & Footer",
    fields: [
      { key: "email", label: "Email", help: "TBA if not yet set" },
      { key: "instagram", label: "Instagram handle", help: "Without @. TBA if not yet set" },
      { key: "instagramUrl", label: "Instagram URL", help: "# if not set" },
      { key: "address", label: "Address", help: "TBA if not yet set" },
    ],
  },
  {
    title: "About",
    hint: "Shown on the About/home page. Blank line separates paragraphs.",
    fields: [
      { key: "aboutLead", label: "About lead", multiline: true },
      { key: "aboutBody", label: "About body", multiline: true },
    ],
  },
  {
    title: "Theme",
    hint: "Shown on the main theme banner. Blank line separates paragraphs.",
    fields: [
      { key: "theme", label: "Theme statement", help: "e.g. From Vulnerability to Voice" },
      { key: "themeLead", label: "Theme lead", multiline: true },
      { key: "themeBody", label: "Theme body", multiline: true },
    ],
  },
];

export function ConferenceForm({ conference }: { conference: Conference }) {
  const update = useUpdateConference();

  return (
    <div className="max-w-2xl space-y-8">
      {GROUPS.map((group) => (
        <section key={group.title}>
          <div className="mb-2 flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">{group.title}</h2>
            {group.hint && (
              <span className="text-xs text-neutral-400">{group.hint}</span>
            )}
          </div>
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
            {group.fields.map(({ key, label, help, multiline }) => (
              <label key={key} className="block">
                <span className="text-xs font-medium text-neutral-600">
                  {label}
                  {help && (
                    <span className="ml-1.5 font-normal text-neutral-400">
                      {help}
                    </span>
                  )}
                </span>
                <div className="mt-1">
                  {multiline ? (
                    <InlineTextarea
                      ariaLabel={label}
                      value={conference[key] ?? ""}
                      pending={update.isPending}
                      rows={key === "aboutBody" || key === "themeBody" ? 5 : 3}
                      onCommit={(v) => update.mutateAsync({ [key]: v })}
                    />
                  ) : (
                    <InlineText
                      ariaLabel={label}
                      value={conference[key] ?? ""}
                      placeholder={help}
                      pending={update.isPending}
                      className="border-neutral-300"
                      onCommit={(v) => update.mutateAsync({ [key]: v })}
                    />
                  )}
                </div>
              </label>
            ))}
          </div>
        </section>
      ))}

      {update.error && (
        <p className="text-sm text-red-600">
          Save failed:{" "}
          {update.error instanceof ApiError
            ? update.error.message
            : "Please try again."}
        </p>
      )}
    </div>
  );
}
