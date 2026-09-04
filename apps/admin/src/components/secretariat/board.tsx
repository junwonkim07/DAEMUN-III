// apps/admin/src/components/secretariat/board.tsx
"use client";

import { useRef, useState } from "react";
import type { Department, Person, SiteData } from "@daemun/shared";
import { ApiError, MAX_UPLOAD_BYTES } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  departmentHooks,
  peopleHooks,
  useRemoveDepartmentWithMembers,
  useUploadPersonPhoto,
} from "@/lib/secretariat";
import { InlineText, InlineTextarea } from "@/components/inline-edit";
import { ChairsSection } from "@/components/secretariat/chairs";

/** SiteData.secretariat를 편집 가능한 평면 구조로 되돌린다. */
export function SecretariatBoard({ site }: { site: SiteData }) {
  const { director, executives, departments } = site.secretariat;

  return (
    <div className="space-y-8">
      <Section title="Director-General" hint="1 person">
        {director ? (
          <PersonCard person={director} siblings={[director]} />
        ) : (
          <AddPerson section="director" label="Add Director-General" />
        )}
      </Section>

      <Section title="Executives">
        <PeopleList people={executives} section="executive" />
      </Section>

      <Section title="Departments" hint="Name, description, members">
        <Departments departments={departments} />
      </Section>

      <ChairsSection site={site} />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  People                                                             */
/* ------------------------------------------------------------------ */

function PeopleList({
  people,
  section,
  departmentId,
}: {
  people: Person[];
  section: Person["section"];
  departmentId?: string;
}) {
  return (
    <div className="space-y-2">
      {people.map((p) => (
        <PersonCard key={p.id} person={p} siblings={people} />
      ))}
      <AddPerson
        section={section}
        departmentId={departmentId}
        label={section === "department" ? "Add member" : "Add person"}
      />
    </div>
  );
}

function AddPerson({
  section,
  departmentId,
  label,
}: {
  section: Person["section"];
  departmentId?: string;
  label: string;
}) {
  const create = peopleHooks.useCreate();
  return (
    <div>
      <button
        type="button"
        disabled={create.isPending}
        onClick={() =>
          create.mutate({
            name: "New Person",
            role: "",
            section,
            departmentId: departmentId ?? null,
          })
        }
        className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-50"
      >
        + {label}
      </button>
      {create.error && (
        <p className="mt-1 text-xs text-red-600">
          {(create.error as Error).message}
        </p>
      )}
    </div>
  );
}

function PersonCard({
  person,
  siblings,
}: {
  person: Person;
  siblings: Person[];
}) {
  const update = peopleHooks.useUpdate();
  const remove = peopleHooks.useRemove();
  const reorder = peopleHooks.useReorder();

  const idx = siblings.findIndex((p) => p.id === person.id);
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < siblings.length - 1;
  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = idx + dir;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    reorder.mutate(next.map((p) => p.id));
  };

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err =
    (update.error as Error | null) ??
    (remove.error as Error | null) ??
    (reorder.error as Error | null);

  return (
    <div className="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
      <PhotoCell person={person} />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <InlineText
              ariaLabel="Name"
              value={person.name}
              placeholder="Name"
              pending={update.isPending}
              onCommit={(name) => update.mutateAsync({ id: person.id, patch: { name } })}
              className="text-[15px] font-medium"
            />
            <InlineText
              ariaLabel="Role"
              value={person.role}
              placeholder="e.g. Deputy Secretary-General"
              pending={update.isPending}
              onCommit={(role) => update.mutateAsync({ id: person.id, patch: { role } })}
              className="text-xs text-neutral-500"
            />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton label="Move up" disabled={!canUp || busy} onClick={() => move(-1)}>
              ↑
            </IconButton>
            <IconButton label="Move down" disabled={!canDown || busy} onClick={() => move(1)}>
              ↓
            </IconButton>
            <IconButton
              label="Delete"
              danger
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Delete "${person.name}"?`))
                  remove.mutate(person.id);
              }}
            >
              ✕
            </IconButton>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-neutral-400">Greeting (blank line separates paragraphs)</label>
          <InlineTextarea
            ariaLabel="Greeting"
            value={person.greeting ?? ""}
            placeholder="Greeting — leave blank to hide from the site"
            pending={update.isPending}
            onCommit={(greeting) =>
              update.mutateAsync({ id: person.id, patch: { greeting: greeting || null } })
            }
          />
        </div>

        <StatusLine busy={busy} err={err} />
      </div>
    </div>
  );
}

function PhotoCell({ person }: { person: Person }) {
  const upload = useUploadPersonPhoto();
  const update = peopleHooks.useUpdate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);

  // 업로드/교체와 삭제는 다른 mutation — 같은 busy로 묶어 경합을 막는다
  const busy = upload.isPending || update.isPending;
  const err =
    localErr ??
    (upload.error as Error | null)?.message ??
    (update.error as Error | null)?.message ??
    null;

  function pick(file: File | undefined) {
    setLocalErr(null);
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setLocalErr("Images only (jpg/png/webp)");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalErr("Files over 25MB cannot be uploaded");
      return;
    }
    upload.mutate({ id: person.id, file });
  }

  return (
    <div className="w-24 shrink-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded border border-neutral-200 bg-neutral-100">
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo}
            alt={person.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
            No photo
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          // Clear so selecting the same file again still fires a change
          e.target.value = "";
        }}
      />
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
        >
          {upload.isPending ? "Uploading…" : person.photo ? "Replace" : "Upload"}
        </button>
        {person.photo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete ${person.name}'s photo?`))
                update.mutate({ id: person.id, patch: { photo: null } });
            }}
            className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
      {err && <p className="text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Departments                                                        */
/* ------------------------------------------------------------------ */

function Departments({
  departments,
}: {
  departments: (Department & { members: Person[] })[];
}) {
  const create = departmentHooks.useCreate();
  return (
    <div className="space-y-4">
      {departments.map((d) => (
        <DepartmentCard key={d.id} department={d} siblings={departments} />
      ))}
      <button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate({ name: "New Department", blurb: "" })}
        className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-50"
      >
        + Add department
      </button>
      {create.error && (
        <p className="text-xs text-red-600">{(create.error as Error).message}</p>
      )}
    </div>
  );
}

function DepartmentCard({
  department,
  siblings,
}: {
  department: Department & { members: Person[] };
  siblings: (Department & { members: Person[] })[];
}) {
  const update = departmentHooks.useUpdate();
  const remove = useRemoveDepartmentWithMembers();
  const reorder = departmentHooks.useReorder();

  const idx = siblings.findIndex((d) => d.id === department.id);
  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = idx + dir;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    reorder.mutate(next.map((d) => d.id));
  };
  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err =
    (update.error as Error | null) ??
    (remove.error as Error | null) ??
    (reorder.error as Error | null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <InlineText
            ariaLabel="Department name"
            value={department.name}
            placeholder="Department name"
            pending={update.isPending}
            onCommit={(name) => update.mutateAsync({ id: department.id, patch: { name } })}
            className="text-sm font-semibold"
          />
          <InlineTextarea
            ariaLabel="Department description"
            value={department.blurb}
            placeholder="Department description"
            rows={2}
            pending={update.isPending}
            onCommit={(blurb) => update.mutateAsync({ id: department.id, patch: { blurb } })}
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label="Move up" disabled={idx <= 0 || busy} onClick={() => move(-1)}>
            ↑
          </IconButton>
          <IconButton
            label="Move down"
            disabled={idx < 0 || idx >= siblings.length - 1 || busy}
            onClick={() => move(1)}
          >
            ↓
          </IconButton>
          <IconButton
            label="Delete department"
            danger
            disabled={busy}
            onClick={() => {
              const n = department.members.length;
              const msg =
                n > 0
                  ? `Delete the "${department.name}" department along with its ${n} member(s)? This cannot be undone.`
                  : `Delete the "${department.name}" department?`;
              if (window.confirm(msg))
                remove.mutate({
                  id: department.id,
                  memberIds: department.members.map((m) => m.id),
                });
            }}
          >
            ✕
          </IconButton>
        </div>
      </div>

      <div className="mt-1">
        <StatusLine busy={busy} err={err} />
      </div>

      <div className="mt-3 border-t border-neutral-200 pt-3">
        <PeopleList
          people={department.members}
          section="department"
          departmentId={department.id}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-xs text-neutral-400 disabled:opacity-30",
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-neutral-100 hover:text-neutral-800",
      )}
    >
      {children}
    </button>
  );
}

function StatusLine({ busy, err }: { busy: boolean; err: Error | null }) {
  if (!busy && !err) return null;
  return (
    <p className="text-[11px]">
      {busy && <span className="text-neutral-400">Saving…</span>}
      {err && (
        <span className="text-red-600">
          {err instanceof ApiError ? err.message : "Save failed"}
        </span>
      )}
    </p>
  );
}
