// apps/admin/src/components/inline-edit.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) setDraft(value);
  }, [value]);
  return {
    draft,
    setDraft: (v: string) => {
      dirtyRef.current = true;
      setDraft(v);
    },
    reset: () => {
      dirtyRef.current = false;
      setDraft(value);
    },
    commit: (onCommit: (v: string) => void) => {
      dirtyRef.current = false;
      if (draft.trim() !== value.trim()) onCommit(draft.trim());
      else setDraft(value);
    },
  };
}

/** 한 줄 인라인 편집. 값이 바뀐 채로 blur / Enter → onCommit. Esc → 되돌림. */
export function InlineText({
  value,
  placeholder,
  onCommit,
  pending,
  ariaLabel,
  className,
}: {
  value: string;
  placeholder?: string;
  onCommit: (next: string) => void;
  pending?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const d = useDraft(value);
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={d.draft}
      placeholder={placeholder}
      disabled={pending}
      onChange={(e) => d.setDraft(e.target.value)}
      onBlur={() => d.commit(onCommit)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          d.reset();
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

/** 여러 줄 인라인 편집. blur 시 변경분만 커밋. */
export function InlineTextarea({
  value,
  placeholder,
  onCommit,
  pending,
  ariaLabel,
  rows = 3,
}: {
  value: string;
  placeholder?: string;
  onCommit: (next: string) => void;
  pending?: boolean;
  ariaLabel: string;
  rows?: number;
}) {
  const d = useDraft(value);
  return (
    <textarea
      aria-label={ariaLabel}
      value={d.draft}
      placeholder={placeholder}
      disabled={pending}
      rows={rows}
      onChange={(e) => d.setDraft(e.target.value)}
      onBlur={() => d.commit(onCommit)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          d.reset();
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-full resize-y rounded border border-neutral-200 bg-white px-2 py-1.5 text-sm leading-relaxed",
        "focus:border-neutral-500 focus:outline-none",
        pending && "opacity-50",
      )}
    />
  );
}
