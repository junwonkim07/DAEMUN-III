// apps/admin/src/components/secretariat/chairs.tsx
//
// Per-committee chairs (section: "chair"). Rendered as the last section of the
// Secretariat screen. Data and API reuse the existing /people CRUD — a chair is
// tied to its committee by committeeId.
"use client";

import { useRef, useState } from "react";
import type { CommitteeWithTopics, Person, SiteData } from "@daemun/shared";
import { ApiError, MAX_UPLOAD_BYTES } from "@/lib/api";
import { peopleHooks, useUploadPersonPhoto } from "@/lib/secretariat";
import { InlineText } from "@/components/inline-edit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";

function msg(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : "Save failed.";
}

export function ChairsSection({ site }: { site: SiteData }) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-2">
        <h2 className="font-custom text-[17px] tracking-[0.02em] text-ink">Chairs</h2>
        <span className="text-xs text-faint">
          Dais by committee — the first entry is the head chair
        </span>
      </div>

      {site.committees.length === 0 ? (
        <p className="text-sm text-faint">
          Add a committee under &ldquo;Committees &amp; Topics&rdquo; first.
        </p>
      ) : (
        <div className="space-y-4">
          {site.committees.map((c) => (
            <CommitteeChairs
              key={c.id}
              committee={c}
              chairs={site.secretariat.chairs[c.slug] ?? []}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CommitteeChairs({
  committee,
  chairs,
}: {
  committee: CommitteeWithTopics;
  chairs: Person[];
}) {
  const create = peopleHooks.useCreate();

  return (
    <Card className="overflow-hidden">
      <header className="flex items-baseline gap-2 border-b border-line bg-wash/60 px-3 py-2">
        <span className="text-xs font-semibold text-body">
          {committee.code}
        </span>
        <span className="truncate text-xs text-faint">{committee.name}</span>
      </header>

      <div className="space-y-2 p-3">
        {chairs.length === 0 ? (
          <p className="text-xs text-faint">No chairs yet</p>
        ) : (
          chairs.map((p, i) => (
            <ChairRow key={p.id} person={p} siblings={chairs} index={i} />
          ))
        )}

        <Button
          variant="ghost"
          disabled={create.isPending}
          onClick={() =>
            create.mutate({
              name: "New Chair",
              role: "",
              section: "chair",
              committeeId: committee.id,
            })
          }
        >
          + Add chair
        </Button>
        {create.error && (
          <p className="text-xs text-[#b23b3b]">{msg(create.error)}</p>
        )}
      </div>
    </Card>
  );
}

function ChairRow({
  person,
  siblings,
  index,
}: {
  person: Person;
  siblings: Person[];
  index: number;
}) {
  const update = peopleHooks.useUpdate();
  const remove = peopleHooks.useRemove();
  const reorder = peopleHooks.useReorder();

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err = msg(reorder.error) ?? msg(remove.error);

  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = index + dir;
    [next[index], next[j]] = [next[j]!, next[index]!];
    reorder.mutate(next.map((p) => p.id));
  };

  const patch = (p: Parameters<typeof update.mutateAsync>[0]["patch"]) =>
    update.mutateAsync({ id: person.id, patch: p });

  return (
    <div className="flex gap-3 rounded-lg border border-line bg-wash/60 p-2">
      <ChairPhoto person={person} />

      <div className="min-w-0 flex-1 space-y-1">
        <InlineText
          ariaLabel="Name"
          value={person.name}
          placeholder="Name"
          pending={update.isPending}
          className="text-sm font-medium"
          onCommit={(name) => patch({ name })}
        />
        <InlineText
          ariaLabel="Role"
          value={person.role}
          placeholder="e.g. Head Chair, Deputy Chair"
          pending={update.isPending}
          className="text-xs text-muted"
          onCommit={(role) => patch({ role })}
        />
        {err && <p className="text-xs text-[#b23b3b]">{err}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Move up" disabled={index <= 0 || busy} onClick={() => move(-1)}>
          ↑
        </IconButton>
        <IconButton
          label="Move down"
          disabled={index >= siblings.length - 1 || busy}
          onClick={() => move(1)}
        >
          ↓
        </IconButton>
        <IconButton
          label="Delete chair"
          danger
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete chair "${person.name}"?`))
              remove.mutate(person.id);
          }}
        >
          ✕
        </IconButton>
      </div>
    </div>
  );
}

function ChairPhoto({ person }: { person: Person }) {
  const upload = useUploadPersonPhoto();
  const update = peopleHooks.useUpdate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoOk = person.photo && person.photo !== failedUrl;
  const busy = upload.isPending || update.isPending;

  function pick(file: File | undefined) {
    setLocalErr(null);
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setLocalErr("Images only (jpg/png/webp)");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalErr("File exceeds 25MB");
      return;
    }
    upload.mutate({ id: person.id, file });
  }

  return (
    <div className="w-14 shrink-0">
      <div className="relative aspect-square overflow-hidden rounded border border-line bg-wash">
        {photoOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo!}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(person.photo)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] text-faint">
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
          e.target.value = "";
        }}
      />
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="text-muted hover:text-ink disabled:opacity-50"
        >
          {upload.isPending ? "…" : person.photo ? "Replace" : "Upload"}
        </button>
        {person.photo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => update.mutate({ id: person.id, patch: { photo: null } })}
            className="text-faint hover:text-[#b23b3b] disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>
      {(localErr || upload.error || update.error) && (
        <p className="text-[10px] text-[#b23b3b]">
          {localErr ?? msg(upload.error) ?? msg(update.error)}
        </p>
      )}
    </div>
  );
}
