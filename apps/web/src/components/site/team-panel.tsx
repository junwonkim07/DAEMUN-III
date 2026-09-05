"use client";

import { Loader2, ShieldCheck, Upload, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DelegateTeam = {
  team: {
    id: string;
    name: string;
    isLead: boolean;
    committee: { slug: string; code: string; name: string } | null;
    topic: { id: string; title: string } | null;
  } | null;
  resolution: { id: string; document: string | null; status: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  awaiting: "Not submitted yet",
  review: "Under review by the Secretariat",
  approved: "Approved — awaiting publication",
  published: "Published",
};

/**
 * §6-1: shown on /account once a delegate has been placed on a team by the
 * Secretariat. Only the team's lead can upload (decision D — team
 * co-editing is a fast-follow); everyone on the team can see status.
 */
export function TeamPanel() {
  const [data, setData] = useState<DelegateTeam | "loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delegate/team")
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((json: DelegateTeam) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === "loading") {
    return (
      <div className="mt-10 flex items-center gap-2 text-[14px] text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading your team…
      </div>
    );
  }

  if (data === "error") return null; // not fatal — the rest of /account still works

  if (!data.team) {
    return (
      <div className="mt-10 rounded-2xl border border-line bg-wash px-6 py-5">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Users className="size-4" />
          Team
        </p>
        <p className="mt-1.5 text-[14px] text-muted">
          You haven&apos;t been placed on a team yet. The Secretariat assigns teams once
          committees are finalized — check back closer to the conference.
        </p>
      </div>
    );
  }

  const { team, resolution } = data;

  return (
    <div className="mt-10 rounded-2xl border border-line bg-wash px-6 py-5">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Users className="size-4" />
        {team.name || "Your team"}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        {team.committee ? `${team.committee.code} · ${team.committee.name}` : "Committee TBA"}
        {team.topic && ` — ${team.topic.title}`}
      </p>

      <div className="mt-4 flex items-center gap-2 text-[13px] text-body">
        <ShieldCheck className="size-4 text-brand" />
        {resolution
          ? (STATUS_LABEL[resolution.status] ?? resolution.status)
          : "No draft submitted yet"}
      </div>

      {team.isLead ? (
        <UploadRow resolution={resolution} onUploaded={(r) => setData({ team, resolution: r })} />
      ) : (
        <p className="mt-3 text-[13px] text-faint">
          Only your team&apos;s lead can upload the draft. Ask them to submit it once it&apos;s
          ready.
        </p>
      )}
    </div>
  );
}

function UploadRow({
  resolution,
  onUploaded,
}: {
  resolution: DelegateTeam["resolution"];
  onUploaded: (r: NonNullable<DelegateTeam["resolution"]>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/delegate/resolutions", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed.");
      onUploaded(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {resolution?.document && (
        <a
          href={resolution.document}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-medium text-ink hover:bg-wash"
        >
          View current draft
        </a>
      )}
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {resolution?.document ? "Replace draft" : "Upload draft"}
      </button>
      {error && <p className="w-full text-[12px] text-[#c62828]">{error}</p>}
    </div>
  );
}
