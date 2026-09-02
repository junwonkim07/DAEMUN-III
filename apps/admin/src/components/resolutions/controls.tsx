// apps/admin/src/components/resolutions/controls.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ResolutionStatus } from "@daemun/shared";
import { cn } from "@/lib/cn";

export const STATUS_META: Record<
  ResolutionStatus,
  { label: string; active: string; idle: string }
> = {
  awaiting: {
    label: "미제출",
    active: "bg-neutral-200 text-neutral-900",
    idle: "text-neutral-500 hover:bg-neutral-100",
  },
  review: {
    label: "리뷰 중",
    active: "bg-amber-500 text-white",
    idle: "text-neutral-500 hover:bg-neutral-100",
  },
  approved: {
    label: "승인",
    active: "bg-emerald-600 text-white",
    idle: "text-neutral-500 hover:bg-neutral-100",
  },
};

const ORDER: ResolutionStatus[] = ["awaiting", "review", "approved"];

export function StatusControl({
  value,
  onChange,
  disabled,
}: {
  value: ResolutionStatus;
  onChange: (next: ResolutionStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="상태"
      className="inline-flex overflow-hidden rounded-md border border-neutral-300 text-xs"
    >
      {ORDER.map((status, i) => {
        const meta = STATUS_META[status];
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => !active && onChange(status)}
            className={cn(
              "px-2.5 py-1 font-medium transition-colors disabled:opacity-50",
              i > 0 && "border-l border-neutral-300",
              active ? meta.active : meta.idle,
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 텍스트 한 줄 인라인 편집. 값이 바뀐 채로 blur되거나 Enter를 치면 onCommit.
 * 저장 중/실패 상태를 밖에서 넘겨 표시한다.
 */
export function InlineText({
  value,
  placeholder,
  onCommit,
  pending,
  ariaLabel,
}: {
  value: string;
  placeholder?: string;
  onCommit: (next: string) => void;
  pending?: boolean;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const dirtyRef = useRef(false);

  // 서버 값이 갱신되면(그리고 편집 중이 아니면) 반영
  useEffect(() => {
    if (!dirtyRef.current) setDraft(value);
  }, [value]);

  function commit() {
    dirtyRef.current = false;
    if (draft.trim() !== value.trim()) onCommit(draft.trim());
    else setDraft(value);
  }

  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={draft}
      placeholder={placeholder}
      disabled={pending}
      onChange={(e) => {
        dirtyRef.current = true;
        setDraft(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          dirtyRef.current = false;
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm",
        "hover:border-neutral-300 focus:border-neutral-500 focus:bg-white focus:outline-none",
        pending && "opacity-50",
      )}
    />
  );
}
