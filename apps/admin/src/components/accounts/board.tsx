// apps/admin/src/components/accounts/board.tsx
"use client";

import { useState } from "react";
import {
  GRADE_OPTIONS,
  MUN_EXPERIENCE_OPTIONS,
} from "@daemun/shared";
import { useSession } from "@/lib/auth-client";
import {
  useBanUser,
  useCreateAdmin,
  useSetRole,
  useUnbanUser,
  type AdminUser,
} from "@/lib/accounts";
import { cn } from "@/lib/cn";

const GRADE_LABEL = Object.fromEntries(
  GRADE_OPTIONS.map((o) => [o.value, o.label]),
);
const MUN_LABEL = Object.fromEntries(
  MUN_EXPERIENCE_OPTIONS.map((o) => [o.value, o.label]),
);

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB");
}

export function AccountsBoard({ users }: { users: AdminUser[] }) {
  const admins = users.filter((u) => u.role === "admin");
  const delegates = users.filter((u) => u.role !== "admin");

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="text-sm font-semibold">Admins</h2>
          <span className="text-xs text-neutral-400">
            Have panel access ({admins.length})
          </span>
        </div>
        <div className="space-y-2">
          {admins.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
          <AddAdmin />
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="text-sm font-semibold">Delegates</h2>
          <span className="text-xs text-neutral-400">
            Self-registered delegates ({delegates.length})
          </span>
        </div>
        {delegates.length === 0 ? (
          <p className="text-sm text-neutral-400">None yet</p>
        ) : (
          <div className="space-y-2">
            {delegates.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const { data: session } = useSession();
  const isSelf = session?.user?.id === user.id;

  const setRole = useSetRole();
  const ban = useBanUser();
  const unban = useUnbanUser();

  const busy = setRole.isPending || ban.isPending || unban.isPending;
  const err =
    (setRole.error as Error | null)?.message ??
    (ban.error as Error | null)?.message ??
    (unban.error as Error | null)?.message ??
    null;

  const isAdmin = user.role === "admin";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">
              {user.name || "(no name)"}
            </span>
            {!user.emailVerified && (
              <Badge tone="amber">Email unverified</Badge>
            )}
            {user.banned && <Badge tone="red">Banned</Badge>}
            {isSelf && <Badge tone="neutral">You</Badge>}
          </div>
          <div className="truncate text-xs text-neutral-500">{user.email}</div>
        </div>

        <span className="text-xs text-neutral-400">
          Joined {fmtDate(user.createdAt)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={busy || isSelf}
            title={isSelf ? "You can't change your own role" : undefined}
            onClick={() => {
              const next = isAdmin ? "delegate" : "admin";
              if (
                window.confirm(
                  `Change ${user.email}'s role to "${next}"?` +
                    (next === "admin" ? " (grants full panel access)" : ""),
                )
              )
                setRole.mutate({ userId: user.id, role: next });
            }}
            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40"
          >
            {isAdmin ? "→ Make delegate" : "→ Make admin"}
          </button>

          {user.banned ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => unban.mutate({ userId: user.id })}
              className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40"
            >
              Unban
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || isSelf}
              title={isSelf ? "You can't ban your own account" : undefined}
              onClick={() => {
                if (window.confirm(`Ban ${user.email}? (blocks sign-in)`))
                  ban.mutate({ userId: user.id });
              }}
              className="rounded border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Ban
            </button>
          )}
        </div>
      </div>

      {(user.grade || user.committee || user.munExperience) && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
          {user.grade && <span>Grade: {GRADE_LABEL[user.grade] ?? user.grade}</span>}
          {user.committee && <span>Committee: {user.committee}</span>}
          {user.munExperience && (
            <span>Experience: {MUN_LABEL[user.munExperience] ?? user.munExperience}</span>
          )}
        </div>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function AddAdmin() {
  const create = useCreateAdmin();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-800"
      >
        + Add admin
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate(
          { email: email.trim(), name: name.trim(), password },
          {
            onSuccess: () => {
              setOpen(false);
              setEmail("");
              setName("");
              setPassword("");
            },
          },
        );
      }}
      className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3"
    >
      <p className="text-xs font-medium text-neutral-600">New admin account</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          type="text"
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="rounded border border-neutral-300 px-2 py-1 text-sm"
        />
      </div>
      <p className="text-[11px] text-neutral-400">
        Created ready to sign in immediately, without email verification.
      </p>
      {create.error && (
        <p className="text-xs text-red-600">
          {(create.error as Error).message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "red" | "neutral";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        tone === "amber" && "bg-amber-100 text-amber-700",
        tone === "red" && "bg-red-100 text-red-700",
        tone === "neutral" && "bg-neutral-200 text-neutral-600",
      )}
    >
      {children}
    </span>
  );
}
