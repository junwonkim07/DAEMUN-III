// apps/admin/src/components/announcements/board.tsx
"use client";

import type { Announcement } from "@daemun/shared";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { announcementHooks } from "@/lib/announcements";
import { InlineText, InlineTextarea } from "@/components/inline-edit";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

function msg(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : "Save failed.";
}

export function AnnouncementsBoard({ announcements }: { announcements: Announcement[] }) {
  const create = announcementHooks.useCreate();

  return (
    <div className="space-y-3">
      {announcements.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          No announcements yet. Add one with the button below — it stays a draft until you
          tick &ldquo;Published&rdquo;.
        </p>
      )}

      {announcements.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} siblings={announcements} />
      ))}

      <div>
        <Button variant="ghost" disabled={create.isPending} onClick={() => create.mutate({})}>
          + Add announcement
        </Button>
        {create.error && (
          <p className="mt-1 text-xs text-[#b23b3b]">{msg(create.error)}</p>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({
  announcement: a,
  siblings,
}: {
  announcement: Announcement;
  siblings: Announcement[];
}) {
  const update = announcementHooks.useUpdate();
  const remove = announcementHooks.useRemove();
  const reorder = announcementHooks.useReorder();

  const idx = siblings.findIndex((x) => x.id === a.id);
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < siblings.length - 1;
  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = idx + dir;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    reorder.mutate(next.map((x) => x.id));
  };

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err = msg(update.error) ?? msg(remove.error) ?? msg(reorder.error);

  const patch = (p: Parameters<typeof update.mutateAsync>[0]["patch"]) =>
    update.mutateAsync({ id: a.id, patch: p });

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3",
        !a.published && "border-gold-soft bg-gold-soft/[0.06]",
        a.published && a.urgent && "border-[#e5c4c4]",
        a.published && !a.urgent && "border-line",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <InlineText
            ariaLabel="Title"
            value={a.title}
            placeholder="Title"
            pending={update.isPending}
            className="text-[15px] font-medium"
            onCommit={(title) => patch({ title })}
          />
          <div>
            <label className="text-[11px] text-faint">Body (blank line separates paragraphs)</label>
            <InlineTextarea
              ariaLabel="Body"
              value={a.body}
              placeholder="What changed, and what delegates should do about it"
              rows={4}
              pending={update.isPending}
              onCommit={(body) => patch({ body })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <label className="shrink-0 text-[11px] text-faint">Date</label>
              <InlineText
                ariaLabel="Date"
                value={a.date}
                placeholder="YYYY-MM-DD"
                pending={update.isPending}
                className="w-32 border-line text-xs"
                onCommit={(date) => patch({ date })}
              />
            </div>
            <label className="flex items-center gap-1.5 text-body">
              <input
                type="checkbox"
                checked={a.urgent}
                disabled={busy}
                onChange={(e) => update.mutate({ id: a.id, patch: { urgent: e.target.checked } })}
              />
              Urgent (pinned + highlighted)
            </label>
            <label className="flex items-center gap-1.5 text-body">
              <input
                type="checkbox"
                checked={a.published}
                disabled={busy}
                onChange={(e) => update.mutate({ id: a.id, patch: { published: e.target.checked } })}
              />
              Published (live on the site)
            </label>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label="Move up" disabled={!canUp || busy} onClick={() => move(-1)}>
            ↑
          </IconButton>
          <IconButton label="Move down" disabled={!canDown || busy} onClick={() => move(1)}>
            ↓
          </IconButton>
          <IconButton
            label="Delete"
            danger
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete "${a.title || "this announcement"}"?`))
                remove.mutate(a.id);
            }}
          >
            ✕
          </IconButton>
        </div>
      </div>

      {(busy || err) && (
        <p className="mt-1 text-[11px]">
          {busy && <span className="text-faint">Saving…</span>}
          {err && <span className="text-[#b23b3b]">{err}</span>}
        </p>
      )}
    </div>
  );
}
