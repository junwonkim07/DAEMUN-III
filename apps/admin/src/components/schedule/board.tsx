// apps/admin/src/components/schedule/board.tsx
"use client";

import type { ScheduleDayWithItems, ScheduleItem, SiteData } from "@daemun/shared";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayHooks, itemHooks } from "@/lib/schedule";
import { InlineText } from "@/components/inline-edit";

function msg(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : "Save failed.";
}

export function ScheduleBoard({ site }: { site: SiteData }) {
  const create = dayHooks.useCreate();

  return (
    <div className="space-y-5">
      {site.schedule.length === 0 && (
        <p className="text-sm text-neutral-400">
          No dates yet. Adding a date makes the schedule section appear on
          the homepage.
        </p>
      )}

      {site.schedule.map((day, i) => (
        <DayCard key={day.id} day={day} siblings={site.schedule} index={i} />
      ))}

      <div>
        <button
          type="button"
          disabled={create.isPending}
          onClick={() =>
            create.mutate({ day: `Day ${site.schedule.length + 1}` })
          }
          className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-50"
        >
          + Add date
        </button>
        {create.error && (
          <p className="mt-1 text-xs text-red-600">{msg(create.error)}</p>
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  siblings,
  index,
}: {
  day: ScheduleDayWithItems;
  siblings: ScheduleDayWithItems[];
  index: number;
}) {
  const update = dayHooks.useUpdate();
  const remove = dayHooks.useRemove();
  const reorder = dayHooks.useReorder();

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err = msg(remove.error) ?? msg(reorder.error);

  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = index + dir;
    [next[index], next[j]] = [next[j]!, next[index]!];
    reorder.mutate(next.map((d) => d.id));
  };

  const patch = (p: Parameters<typeof update.mutateAsync>[0]["patch"]) =>
    update.mutateAsync({ id: day.id, patch: p });

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <header className="flex items-start gap-3 border-b border-neutral-200 bg-neutral-50 p-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Labeled label="Day label">
            <InlineText
              ariaLabel="Day label"
              value={day.day}
              placeholder="e.g. Day One"
              pending={update.isPending}
              className="font-semibold"
              onCommit={(v) => patch({ day: v })}
            />
          </Labeled>
          <Labeled label="Date (leave blank for TBA)">
            <InlineText
              ariaLabel="Date"
              value={day.date}
              placeholder="e.g. Saturday, October 4, 2025"
              pending={update.isPending}
              className="text-xs"
              onCommit={(v) => patch({ date: v || "TBA" })}
            />
          </Labeled>
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
            label="Delete date"
            danger
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Deleting "${day.day}" will also delete all its schedule items. Continue?`,
                )
              )
                remove.mutate(day.id);
            }}
          >
            ✕
          </IconButton>
        </div>
      </header>

      {err && <p className="px-4 pt-2 text-xs text-red-600">{err}</p>}

      <Items day={day} />
    </section>
  );
}

function Items({ day }: { day: ScheduleDayWithItems }) {
  const create = itemHooks.useCreate();

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">Schedule items</span>
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate({ dayId: day.id, event: "New item" })}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
        >
          + Add item
        </button>
      </div>
      {create.error && (
        <p className="mb-2 text-xs text-red-600">{msg(create.error)}</p>
      )}
      {day.items.length === 0 ? (
        <p className="text-xs text-neutral-400">No items</p>
      ) : (
        <ul className="space-y-2">
          {day.items.map((it, i) => (
            <ItemRow key={it.id} item={it} siblings={day.items} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemRow({
  item,
  siblings,
  index,
}: {
  item: ScheduleItem;
  siblings: ScheduleItem[];
  index: number;
}) {
  const update = itemHooks.useUpdate();
  const remove = itemHooks.useRemove();
  const reorder = itemHooks.useReorder();

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err = msg(remove.error) ?? msg(reorder.error);

  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = index + dir;
    [next[index], next[j]] = [next[j]!, next[index]!];
    reorder.mutate(next.map((it) => it.id));
  };

  const patch = (p: Parameters<typeof update.mutateAsync>[0]["patch"]) =>
    update.mutateAsync({ id: item.id, patch: p });

  return (
    <li className="rounded-md border border-neutral-200 bg-neutral-50/60 p-2">
      <div className="flex items-start gap-2">
        <div className="w-28 shrink-0">
          <InlineText
            ariaLabel="Time"
            value={item.time}
            placeholder="e.g. 09:30 (leave blank for TBA)"
            pending={update.isPending}
            className="text-xs"
            onCommit={(v) => patch({ time: v || "TBA" })}
          />
        </div>
        <div className="min-w-0 flex-1">
          <InlineText
            ariaLabel="Event"
            value={item.event}
            placeholder="Event (required)"
            pending={update.isPending}
            className="font-medium"
            onCommit={(v) => patch({ event: v })}
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
            label="Delete item"
            danger
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete "${item.event}"?`))
                remove.mutate(item.id);
            }}
          >
            ✕
          </IconButton>
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </li>
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
      <span className="text-[11px] text-neutral-400">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

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
        danger
          ? "hover:bg-red-50 hover:text-red-600"
          : "hover:bg-neutral-100 hover:text-neutral-800",
      )}
    >
      {children}
    </button>
  );
}
