"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Selectable row used by the onboarding steps: icon, label, optional
 * sub-label, radio/checkbox indicator on the right. Whole card is the target.
 */
export function OptionCard({
  icon,
  label,
  sub,
  selected,
  onSelect,
  multi = false,
}: {
  icon?: React.ReactNode;
  label: string;
  sub?: string;
  selected: boolean;
  onSelect: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border bg-white px-6 py-5 text-left transition-all",
        selected
          ? "border-brand shadow-[0_0_0_1px_#0c4884]"
          : "border-line hover:border-ink/30 hover:shadow-[0_2px_10px_rgba(10,20,40,0.05)]",
      )}
    >
      {icon && (
        <span className="flex size-8 shrink-0 items-center justify-center text-brand">{icon}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[17px] font-semibold text-ink">{label}</span>
        {sub && <span className="mt-0.5 text-[13px] text-muted">{sub}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-brand bg-brand" : "border-line bg-[#f1f1f0]",
        )}
      >
        {selected &&
          (multi ? (
            <Check className="size-3.5 text-white" strokeWidth={3} />
          ) : (
            <span className="size-2 rounded-full bg-white" />
          ))}
      </span>
    </button>
  );
}
