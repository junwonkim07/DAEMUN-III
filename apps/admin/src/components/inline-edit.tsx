"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 인라인 편집용 draft 상태.
 *
 * - blur / Enter → 값이 바뀌었으면 `onCommit(draft)`.
 * - Esc → draft를 서버 값으로 되돌리고, 이어지는 blur에서는 커밋하지 않는다.
 * - `onCommit`이 프로미스를 돌려주고 그게 실패하면 draft를 서버 값으로 되돌린다
 *   (거부된 값이 저장된 것처럼 화면에 남지 않도록).
 * - 편집 중이 아닐 때만 서버 값 변경을 draft에 반영한다.
 */
function useDraft(value: string, onCommit: (v: string) => void | Promise<unknown>) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const escapingRef = useRef(false);

  useEffect(() => {
    valueRef.current = value;
    if (!dirtyRef.current) {
      draftRef.current = value;
      setDraft(value);
    }
  }, [value]);

  const set = (v: string) => {
    dirtyRef.current = true;
    draftRef.current = v;
    setDraft(v);
  };

  const revert = () => {
    dirtyRef.current = false;
    draftRef.current = valueRef.current;
    setDraft(valueRef.current);
  };

  const escape = () => {
    escapingRef.current = true;
    revert();
  };

  const commit = () => {
    if (escapingRef.current) {
      escapingRef.current = false;
      return;
    }
    dirtyRef.current = false;
    const next = draftRef.current.trim();
    if (next === valueRef.current.trim()) {
      revert();
      return;
    }
    Promise.resolve(onCommit(next)).catch(() => {
      // 저장 실패: 사용자가 그 사이 다시 편집하지 않았다면 서버 값으로 복구
      if (!dirtyRef.current) revert();
    });
  };

  return { draft, set, escape, commit };
}

type InlineProps = {
  value: string;
  placeholder?: string;
  /** 프로미스를 돌려주면 실패 시 입력값이 서버 값으로 되돌아간다 (`mutateAsync` 권장). */
  onCommit: (next: string) => void | Promise<unknown>;
  /** 저장 중 표시. 입력을 막지는 않는다 — 다음 필드로 Tab 이동 중 포커스를 잃지 않도록. */
  pending?: boolean;
  ariaLabel: string;
  className?: string;
};

/** 한 줄 인라인 편집. 값이 바뀐 채로 blur / Enter → onCommit. Esc → 되돌림. */
export function InlineText({
  value,
  placeholder,
  onCommit,
  pending,
  ariaLabel,
  className,
}: InlineProps) {
  const d = useDraft(value, onCommit);
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      aria-busy={pending || undefined}
      value={d.draft}
      placeholder={placeholder}
      onChange={(e) => d.set(e.target.value)}
      onBlur={d.commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          d.escape();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm",
        "hover:border-neutral-300 focus:border-neutral-500 focus:bg-white focus:outline-none",
        pending && "opacity-50",
        className,
      )}
    />
  );
}

/** 여러 줄 인라인 편집. blur 시 변경분만 커밋. Esc → 되돌림. */
export function InlineTextarea({
  value,
  placeholder,
  onCommit,
  pending,
  ariaLabel,
  rows = 3,
  className,
}: InlineProps & { rows?: number }) {
  const d = useDraft(value, onCommit);
  return (
    <textarea
      aria-label={ariaLabel}
      aria-busy={pending || undefined}
      value={d.draft}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => d.set(e.target.value)}
      onBlur={d.commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          d.escape();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1.5 text-sm leading-relaxed",
        "focus:border-neutral-500 focus:outline-none",
        pending && "opacity-50",
        className,
      )}
    />
  );
}
