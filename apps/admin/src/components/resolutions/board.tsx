// apps/admin/src/components/resolutions/board.tsx
"use client";

import { useId, useRef, useState } from "react";
import type {
  CommitteeWithTopics,
  Resolution,
  ResolutionStatus,
  SiteData,
} from "@daemun/shared";
import { ApiError, MAX_UPLOAD_BYTES } from "@/lib/api";
import { cn } from "@/lib/cn";
import { resolutionHooks, useUploadResolutionDoc } from "@/lib/resolutions";
import { InlineText } from "@/components/inline-edit";
import { STATUS_META, StatusControl } from "./controls";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export function ResolutionBoard({ site }: { site: SiteData }) {
  if (site.committees.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No committees yet. Add committees and topics first.
      </p>
    );
  }
  return (
    <div className="space-y-8">
      {site.committees.map((committee) => (
        <CommitteeSection
          key={committee.id}
          committee={committee}
          resolutions={site.resolutions[committee.slug] ?? []}
        />
      ))}
    </div>
  );
}

function CommitteeSection({
  committee,
  resolutions,
}: {
  committee: CommitteeWithTopics;
  resolutions: Resolution[];
}) {
  const byTopic = new Map<string, Resolution[]>();
  for (const r of resolutions) {
    const list = byTopic.get(r.topicId) ?? [];
    list.push(r);
    byTopic.set(r.topicId, list);
  }
  const knownTopicIds = new Set(committee.topics.map((t) => t.id));
  const orphanTopicIds = [...byTopic.keys()].filter((id) => !knownTopicIds.has(id));

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <header className="flex items-baseline gap-2 border-b border-neutral-200 bg-neutral-50 px-5 py-3">
        <h2 className="text-sm font-semibold">{committee.name}</h2>
        <span className="text-xs text-neutral-500">{committee.code}</span>
      </header>

      <div className="divide-y divide-neutral-100">
        {committee.topics.map((topic, i) => (
          <TopicGroup
            key={topic.id}
            numeral={ROMAN[i] ?? String(i + 1)}
            title={topic.title}
            committeeId={committee.id}
            topicId={topic.id}
            resolutions={byTopic.get(topic.id) ?? []}
          />
        ))}

        {/* Covers a topic moved to another committee (deleting a topic cascades to its
            resolutions in the DB). Adding is blocked here so no row ends up with a
            mismatched committeeId/topicId. */}
        {orphanTopicIds.map((topicId) => (
          <TopicGroup
            key={topicId}
            numeral="—"
            title="Unassigned (topic moved to another committee — move or delete these resolutions)"
            committeeId={committee.id}
            topicId={topicId}
            resolutions={byTopic.get(topicId) ?? []}
            allowAdd={false}
          />
        ))}
      </div>
    </section>
  );
}

/** The N in "Resolution N" — existing max + 1 so deletions don't cause collisions. */
function nextLabel(resolutions: Resolution[]) {
  const max = resolutions.reduce((m, r) => {
    const n = /^Resolution (\d+)$/.exec(r.label.trim());
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `Resolution ${Math.max(max, resolutions.length) + 1}`;
}

function TopicGroup({
  numeral,
  title,
  committeeId,
  topicId,
  resolutions,
  allowAdd = true,
}: {
  numeral: string;
  title: string;
  committeeId: string;
  topicId: string;
  resolutions: Resolution[];
  allowAdd?: boolean;
}) {
  const create = resolutionHooks.useCreate();

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-xs italic text-neutral-400">{numeral}</span>
          <span className="truncate text-sm font-medium text-neutral-800">
            {title || "Untitled topic"}
          </span>
        </div>
        {allowAdd && (
          <button
            type="button"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                committeeId,
                topicId,
                label: nextLabel(resolutions),
                status: "awaiting",
              })
            }
            className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
          >
            + Add resolution
          </button>
        )}
      </div>

      {create.error && (
        <p className="mt-2 text-xs text-red-600">
          Failed to add: {(create.error as Error).message}
        </p>
      )}

      {resolutions.length === 0 ? (
        <p className="mt-2 pl-5 text-xs text-neutral-400">No resolutions submitted</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {resolutions.map((r) => (
            <ResolutionRow key={r.id} resolution={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ResolutionRow({ resolution }: { resolution: Resolution }) {
  const update = resolutionHooks.useUpdate();
  const remove = resolutionHooks.useRemove();

  const busy = update.isPending || remove.isPending;
  const err =
    (update.error as Error | null) ?? (remove.error as Error | null);

  return (
    <li className="rounded-md border border-neutral-200 bg-neutral-50/60 p-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-[9rem] flex-[2]">
          <InlineText
            ariaLabel="Resolution name"
            value={resolution.label}
            placeholder="e.g. Draft Resolution 1.1"
            pending={update.isPending}
            onCommit={(label) => update.mutateAsync({ id: resolution.id, patch: { label } })}
          />
        </div>
        <div className="min-w-[7rem] flex-1">
          <InlineText
            ariaLabel="Submitter"
            value={resolution.submitter}
            placeholder="Submitter"
            pending={update.isPending}
            onCommit={(submitter) =>
              update.mutateAsync({ id: resolution.id, patch: { submitter } })
            }
          />
        </div>

        <StatusControl
          value={resolution.status}
          disabled={busy}
          onChange={(status: ResolutionStatus) =>
            update.mutate({ id: resolution.id, patch: { status } })
          }
        />

        <DocCell resolution={resolution} />

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Delete this resolution?")) remove.mutate(resolution.id);
          }}
          className="ml-auto rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label="Delete resolution"
          title="Delete"
        >
          ✕
        </button>
      </div>

      <div className="mt-1 flex items-center gap-2 pl-1.5 text-[11px] text-neutral-400">
        <span>{STATUS_META[resolution.status].label}</span>
        <span>·</span>
        <span>Updated {new Date(resolution.updatedAt).toLocaleString("en-GB")}</span>
        {busy && <span className="text-neutral-500">Saving…</span>}
        {err && (
          <span className="text-red-600">
            {err instanceof ApiError ? err.message : "Save failed"}
          </span>
        )}
      </div>
    </li>
  );
}

function DocCell({ resolution }: { resolution: Resolution }) {
  const upload = useUploadResolutionDoc();
  const update = resolutionHooks.useUpdate();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [localErr, setLocalErr] = useState<string | null>(null);

  // 업로드/교체와 삭제가 서로 다른 mutation이라 둘 다 같은 busy로 묶는다 —
  // 교체 중에 삭제를 누르면 완료 순서에 따라 결과가 뒤집힌다.
  const busy = upload.isPending || update.isPending;
  const err =
    localErr ??
    (upload.error as Error | null)?.message ??
    (update.error as Error | null)?.message ??
    null;

  function pick(file: File | undefined) {
    setLocalErr(null);
    if (!file) return;
    if (!/\.(pdf|docx?|jpe?g|png|webp)$/i.test(file.name)) {
      setLocalErr("Only PDF, DOC, and image files can be uploaded");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalErr("Files over 25MB cannot be uploaded");
      return;
    }
    upload.mutate({ id: resolution.id, file });
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          // 같은 파일을 다시 고를 때도 change가 나도록 비운다
          e.target.value = "";
        }}
      />
      {resolution.document ? (
        <>
          <a
            href={resolution.document}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-neutral-300 px-2 py-1 font-medium text-neutral-700 hover:bg-white"
          >
            View document
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
          >
            {upload.isPending ? "Uploading…" : "Replace"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Delete this resolution's document link? You will need to upload the file again."))
                update.mutate({ id: resolution.id, patch: { document: null } });
            }}
            className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "rounded border border-dashed border-neutral-300 px-2 py-1 text-neutral-500",
            "hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-50",
          )}
        >
          {upload.isPending ? "Uploading…" : "Upload PDF"}
        </button>
      )}
      {err && <span className="text-red-600">{err}</span>}
    </div>
  );
}
