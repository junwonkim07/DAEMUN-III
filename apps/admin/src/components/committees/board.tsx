// apps/admin/src/components/committees/board.tsx
"use client";

import { useRef, useState } from "react";
import type { CommitteeWithTopics, SiteData, Topic } from "@daemun/shared";
import { ApiError, MAX_UPLOAD_BYTES } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  committeeHooks,
  topicHooks,
  useUploadCommitteeImage,
  useUploadTopicReport,
} from "@/lib/committees";
import { InlineText, InlineTextarea } from "@/components/inline-edit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function msg(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : "Save failed.";
}

export function CommitteesBoard({ site }: { site: SiteData }) {
  const create = committeeHooks.useCreate();
  return (
    <div className="space-y-6">
      {site.committees.map((c, i) => (
        <CommitteeCard
          key={c.id}
          committee={c}
          siblings={site.committees}
          index={i}
        />
      ))}

      <div>
        <Button
          variant="ghost"
          disabled={create.isPending}
          onClick={() =>
            create.mutate({
              slug: `committee-${site.committees.length + 1}`,
              code: "NEW",
              name: "New Committee",
            })
          }
        >
          + Add committee
        </Button>
        {create.error && (
          <p className="mt-1 text-xs text-[#b23b3b]">{msg(create.error)}</p>
        )}
      </div>
    </div>
  );
}

function CommitteeCard({
  committee,
  siblings,
  index,
}: {
  committee: CommitteeWithTopics;
  siblings: CommitteeWithTopics[];
  index: number;
}) {
  const update = committeeHooks.useUpdate();
  const remove = committeeHooks.useRemove();
  const reorder = committeeHooks.useReorder();

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err = msg(remove.error) ?? msg(reorder.error);

  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = index + dir;
    [next[index], next[j]] = [next[j]!, next[index]!];
    reorder.mutate(next.map((c) => c.id));
  };

  const patch = (p: Parameters<typeof update.mutateAsync>[0]["patch"]) =>
    update.mutateAsync({ id: committee.id, patch: p });

  return (
    <Card className="overflow-hidden">
      <header className="flex items-start gap-3 border-b border-line bg-wash/60 p-4">
        <ImageThumb committee={committee} />

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex gap-2">
            <InlineText
              ariaLabel="Code (tab label)"
              value={committee.code}
              placeholder="e.g. ECOSOC"
              pending={update.isPending}
              className="w-28 border-line font-semibold"
              onCommit={(code) => patch({ code })}
            />
            <InlineText
              ariaLabel="Full name"
              value={committee.name}
              placeholder="Full name"
              pending={update.isPending}
              className="flex-1 border-line"
              onCommit={(name) => patch({ name })}
            />
          </div>
          <InlineText
            ariaLabel="Slug"
            value={committee.slug}
            placeholder="Slug (URL/resolution key, lowercase letters, digits, hyphens)"
            pending={update.isPending}
            className="border-line text-xs"
            onCommit={(slug) => patch({ slug })}
          />
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
            label="Delete committee"
            danger
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Deleting "${committee.name}" will also delete its topics and resolutions. Continue?`,
                )
              )
                remove.mutate(committee.id);
            }}
          >
            ✕
          </IconButton>
        </div>
      </header>

      <div className="space-y-3 border-b border-line/60 p-4">
        <Labeled label="Description">
          <InlineTextarea
            ariaLabel="Description"
            value={committee.description}
            placeholder="Committee description (one paragraph)"
            rows={2}
            pending={update.isPending}
            onCommit={(description) => patch({ description })}
          />
        </Labeled>
        <div className="flex gap-3">
          <Labeled label="Source link text" className="flex-1">
            <InlineText
              ariaLabel="Source link text"
              value={committee.sourceLabel ?? ""}
              placeholder="e.g. ecosoc.un.org"
              pending={update.isPending}
              className="border-line"
              onCommit={(v) => patch({ sourceLabel: v || null })}
            />
          </Labeled>
          <Labeled label="Source link URL" className="flex-1">
            <InlineText
              ariaLabel="Source link URL"
              value={committee.sourceUrl ?? ""}
              placeholder="https://…"
              pending={update.isPending}
              className="border-line"
              onCommit={(v) => patch({ sourceUrl: v || null })}
            />
          </Labeled>
        </div>
        {err && <p className="text-xs text-[#b23b3b]">{err}</p>}
      </div>

      <Topics committee={committee} />
    </Card>
  );
}

function ImageThumb({ committee }: { committee: CommitteeWithTopics }) {
  const upload = useUploadCommitteeImage();
  const update = committeeHooks.useUpdate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageOk = committee.image && committee.image !== failedUrl;
  const busy = upload.isPending || update.isPending;

  function pick(file: File | undefined) {
    setLocalErr(null);
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setLocalErr("Images only (jpg/png/webp)");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalErr("Exceeds 25MB");
      return;
    }
    upload.mutate({ id: committee.id, file });
  }

  return (
    <div className="w-24 shrink-0">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-wash">
        {imageOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={committee.image!}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(committee.image)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-faint">
            No image
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
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="text-muted hover:text-ink disabled:opacity-50"
        >
          {upload.isPending ? "Uploading…" : committee.image ? "Replace" : "Upload image"}
        </button>
        {committee.image && (
          <button
            type="button"
            disabled={busy}
            onClick={() => update.mutate({ id: committee.id, patch: { image: null } })}
            className="text-faint hover:text-[#b23b3b] disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
      {localErr && <p className="text-[11px] text-[#b23b3b]">{localErr}</p>}
      {(upload.error || update.error) && (
        <p className="text-[11px] text-[#b23b3b]">
          {msg(upload.error) ?? msg(update.error)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Topics                                                             */
/* ------------------------------------------------------------------ */

function Topics({ committee }: { committee: CommitteeWithTopics }) {
  const create = topicHooks.useCreate();
  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">Topics</span>
        <Button disabled={create.isPending} onClick={() => create.mutate({ committeeId: committee.id })}>
          + Add topic
        </Button>
      </div>
      {create.error && (
        <p className="mb-2 text-xs text-[#b23b3b]">{msg(create.error)}</p>
      )}
      {committee.topics.length === 0 ? (
        <p className="text-xs text-faint">No topics</p>
      ) : (
        <ul className="space-y-2">
          {committee.topics.map((t, i) => (
            <TopicRow
              key={t.id}
              topic={t}
              siblings={committee.topics}
              index={i}
              numeral={ROMAN[i] ?? String(i + 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicRow({
  topic,
  siblings,
  index,
  numeral,
}: {
  topic: Topic;
  siblings: Topic[];
  index: number;
  numeral: string;
}) {
  const update = topicHooks.useUpdate();
  const remove = topicHooks.useRemove();
  const reorder = topicHooks.useReorder();

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err = msg(remove.error) ?? msg(reorder.error);

  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = index + dir;
    [next[index], next[j]] = [next[j]!, next[index]!];
    reorder.mutate(next.map((t) => t.id));
  };

  return (
    <li className="rounded-lg border border-line bg-wash/60 p-2">
      <div className="flex items-start gap-2">
        <span className="pt-1.5 text-xs italic text-faint">{numeral}</span>
        <div className="min-w-0 flex-1 space-y-1">
          <InlineText
            ariaLabel="Topic title"
            value={topic.title}
            placeholder="Topic title (TBA if not yet set)"
            pending={update.isPending}
            className="font-medium"
            onCommit={(title) => update.mutateAsync({ id: topic.id, patch: { title } })}
          />
          <InlineTextarea
            ariaLabel="Topic summary"
            value={topic.summary}
            placeholder="Summary (leave blank to hide from the site)"
            rows={2}
            pending={update.isPending}
            onCommit={(summary) =>
              update.mutateAsync({ id: topic.id, patch: { summary } })
            }
          />
          <ReportCell topic={topic} />
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
            label="Delete topic"
            danger
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Deleting "${topic.title}" will also delete its resolutions. Continue?`,
                )
              )
                remove.mutate(topic.id);
            }}
          >
            ✕
          </IconButton>
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-[#b23b3b]">{err}</p>}
    </li>
  );
}

function ReportCell({ topic }: { topic: Topic }) {
  const upload = useUploadTopicReport();
  const update = topicHooks.useUpdate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const busy = upload.isPending || update.isPending;

  function pick(file: File | undefined) {
    setLocalErr(null);
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      setLocalErr("PDF/DOC only");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalErr("Exceeds 25MB");
      return;
    }
    upload.mutate({ id: topic.id, file });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-faint">Chair report</span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {topic.report ? (
        <>
          <a
            href={topic.report}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-line px-2 py-0.5 font-medium text-body hover:bg-white"
          >
            View
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-muted hover:text-ink disabled:opacity-50"
          >
            {upload.isPending ? "Uploading…" : "Replace"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => update.mutate({ id: topic.id, patch: { report: null } })}
            className="text-faint hover:text-[#b23b3b] disabled:opacity-50"
          >
            Delete
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded border border-dashed border-line px-2 py-0.5 text-muted hover:border-faint hover:text-ink disabled:opacity-50"
        >
          {upload.isPending ? "Uploading…" : "Upload PDF (leave empty to show 'Released in September')"}
        </button>
      )}
      {(localErr || upload.error || update.error) && (
        <span className="text-[#b23b3b]">
          {localErr ?? msg(upload.error) ?? msg(update.error)}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function Labeled({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[11px] text-faint">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}
