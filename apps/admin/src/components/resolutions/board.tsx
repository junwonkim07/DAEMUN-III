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
        위원회가 없습니다. 먼저 위원회·의제를 등록하세요.
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

        {/* 의제가 다른 위원회로 옮겨진 경우 (의제 삭제는 DB cascade로 결의안까지 지운다).
            여기서는 결의안 추가를 막는다 — committeeId/topicId가 어긋난 행이 생기지 않게. */}
        {orphanTopicIds.map((topicId) => (
          <TopicGroup
            key={topicId}
            numeral="—"
            title="미분류 (의제가 다른 위원회로 옮겨짐 — 결의안을 옮기거나 삭제하세요)"
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

/** "결의안 N"의 N — 삭제로 구멍이 나도 겹치지 않게 기존 최대값 + 1. */
function nextLabel(resolutions: Resolution[]) {
  const max = resolutions.reduce((m, r) => {
    const n = /^결의안 (\d+)$/.exec(r.label.trim());
    return n ? Math.max(m, Number(n[1])) : m;
  }, 0);
  return `결의안 ${Math.max(max, resolutions.length) + 1}`;
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
            {title || "제목 미정"}
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
            + 결의안 추가
          </button>
        )}
      </div>

      {create.error && (
        <p className="mt-2 text-xs text-red-600">
          추가 실패: {(create.error as Error).message}
        </p>
      )}

      {resolutions.length === 0 ? (
        <p className="mt-2 pl-5 text-xs text-neutral-400">제출된 결의안 없음</p>
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
            ariaLabel="결의안 이름"
            value={resolution.label}
            placeholder="결의안 이름 (예: Draft Resolution 1.1)"
            pending={update.isPending}
            onCommit={(label) => update.mutateAsync({ id: resolution.id, patch: { label } })}
          />
        </div>
        <div className="min-w-[7rem] flex-1">
          <InlineText
            ariaLabel="제출 팀"
            value={resolution.submitter}
            placeholder="제출 팀"
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
            if (window.confirm("이 결의안을 삭제할까요?")) remove.mutate(resolution.id);
          }}
          className="ml-auto rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label="결의안 삭제"
          title="삭제"
        >
          ✕
        </button>
      </div>

      <div className="mt-1 flex items-center gap-2 pl-1.5 text-[11px] text-neutral-400">
        <span>{STATUS_META[resolution.status].label}</span>
        <span>·</span>
        <span>수정 {new Date(resolution.updatedAt).toLocaleString("ko-KR")}</span>
        {busy && <span className="text-neutral-500">저장 중…</span>}
        {err && (
          <span className="text-red-600">
            {err instanceof ApiError ? err.message : "저장 실패"}
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
      setLocalErr("PDF/DOC/이미지만 업로드 가능");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalErr("25MB를 넘는 파일은 올릴 수 없습니다");
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
            문서 보기
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
          >
            {upload.isPending ? "업로드 중…" : "교체"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("이 결의안의 문서 링크를 삭제할까요? 파일은 다시 올려야 합니다."))
                update.mutate({ id: resolution.id, patch: { document: null } });
            }}
            className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
          >
            삭제
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
          {upload.isPending ? "업로드 중…" : "PDF 업로드"}
        </button>
      )}
      {err && <span className="text-red-600">{err}</span>}
    </div>
  );
}
