// apps/admin/src/components/faqs/board.tsx
"use client";

import type { Faq } from "@daemun/shared";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  useCreateFaq,
  useRemoveFaq,
  useReorderFaqs,
  useUpdateFaq,
} from "@/lib/faqs";
import { InlineText, InlineTextarea } from "@/components/inline-edit";

export function FaqBoard({ faqs }: { faqs: Faq[] }) {
  const create = useCreateFaq();

  return (
    <div className="space-y-3">
      {faqs.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
          No FAQs yet. Add the first one with the button below.
        </p>
      )}

      {faqs.map((faq) => (
        <FaqCard key={faq.id} faq={faq} siblings={faqs} />
      ))}

      <div>
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate({ question: "New question", answer: "" })}
          className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-50"
        >
          + Add FAQ
        </button>
        {create.error && (
          <p className="mt-1 text-xs text-red-600">
            {(create.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}

function FaqCard({ faq, siblings }: { faq: Faq; siblings: Faq[] }) {
  const update = useUpdateFaq();
  const remove = useRemoveFaq();
  const reorder = useReorderFaqs();

  const idx = siblings.findIndex((f) => f.id === faq.id);
  const canUp = idx > 0;
  const canDown = idx >= 0 && idx < siblings.length - 1;
  const move = (dir: -1 | 1) => {
    const next = [...siblings];
    const j = idx + dir;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    reorder.mutate(next.map((f) => f.id));
  };

  const busy = update.isPending || remove.isPending || reorder.isPending;
  const err =
    (update.error as Error | null) ??
    (remove.error as Error | null) ??
    (reorder.error as Error | null);

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3",
        faq.published ? "border-neutral-200" : "border-amber-300 bg-amber-50/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <InlineText
            ariaLabel="Question"
            value={faq.question}
            placeholder="Question (e.g. How much are the fees?)"
            pending={update.isPending}
            onCommit={(question) =>
              update.mutateAsync({ id: faq.id, patch: { question } })
            }
            className="text-[15px] font-medium"
          />
          <div>
            <label className="text-[11px] text-neutral-400">Answer</label>
            <InlineTextarea
              ariaLabel="Answer"
              value={faq.answer}
              placeholder="Answer — the chatbot uses this as its source"
              pending={update.isPending}
              onCommit={(answer) =>
                update.mutateAsync({ id: faq.id, patch: { answer } })
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <label className="shrink-0 whitespace-nowrap text-[11px] text-neutral-400">
                Category
              </label>
              <InlineText
                ariaLabel="Category"
                value={faq.category}
                placeholder="e.g. Registration, Schedule, Fees"
                pending={update.isPending}
                onCommit={(category) =>
                  update.mutateAsync({ id: faq.id, patch: { category } })
                }
                className="text-xs text-neutral-600"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={faq.published}
                disabled={busy}
                onChange={(e) =>
                  update.mutate({
                    id: faq.id,
                    patch: { published: e.target.checked },
                  })
                }
              />
              Public (used by chatbot)
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
              if (window.confirm(`Delete "${faq.question}"?`))
                remove.mutate(faq.id);
            }}
          >
            ✕
          </IconButton>
        </div>
      </div>

      <StatusLine busy={busy} err={err} />
    </div>
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

function StatusLine({ busy, err }: { busy: boolean; err: Error | null }) {
  if (!busy && !err) return null;
  return (
    <p className="mt-1 text-[11px]">
      {busy && <span className="text-neutral-400">Saving…</span>}
      {err && (
        <span className="text-red-600">
          {err instanceof ApiError ? err.message : "Save failed"}
        </span>
      )}
    </p>
  );
}
