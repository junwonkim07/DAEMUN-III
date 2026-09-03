// apps/admin/src/components/resolutions/controls.tsx
"use client";

import type { ResolutionStatus } from "@daemun/shared";
import { cn } from "@/lib/cn";

export { InlineText } from "../inline-edit";

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

