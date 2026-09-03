"use client";
/**
 * Past conference films for the Guide to MUN page. Each edition is a card;
 * clicking the poster mounts the skiper91-style VideoPlayer in place.
 * Editions without a film yet render a quiet placeholder — nothing is faked.
 */
import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { VideoPlayer } from "@/components/site/intro-video";

type Edition = {
  id: string;
  edition: string;
  session: string;
  blurb: string;
  src?: string;
  poster?: string;
  duration?: string;
};

// TODO: move to the database once the admin panel has a videos section.
const EDITIONS: Edition[] = [
  {
    id: "daemun-ii",
    edition: "DAEMUN II",
    session: "Second session · 2025",
    blurb: "The conference film from DAEMUN II — chairs, delegates and committee sessions.",
    src: "/intro.mp4",
    poster: "/video-poster.jpg",
    duration: "4:37",
  },
  {
    id: "daemun-i",
    edition: "DAEMUN I",
    session: "First session · November 2024",
    blurb: "The first DAEMUN conference.",
  },
];

export function PastVideos() {
  return (
    <div className="flex flex-col gap-8">
      {EDITIONS.map((e) => (
        <EditionCard key={e.id} edition={e} />
      ))}
    </div>
  );
}

function EditionCard({ edition: e }: { edition: Edition }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article id={e.id} className="overflow-hidden rounded-sm border border-line bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h4 className="font-custom text-[22px] uppercase text-ink sm:text-[24px]" style={{ lineHeight: 1.1 }}>
            {e.edition}
          </h4>
          <span className="font-roman text-[12px] uppercase tracking-widest text-black/50">
            {e.session}
          </span>
        </div>
        {e.duration ? (
          <span className="text-[13px] tabular-nums text-muted">{e.duration}</span>
        ) : null}
      </div>

      {e.src ? (
        playing ? (
          <div className="aspect-[1600/906] w-full bg-navy">
            <VideoPlayer src={e.src} poster={e.poster ?? ""} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play the ${e.edition} film`}
            className="group relative block aspect-[1600/906] w-full cursor-pointer bg-navy"
          >
            {e.poster ? (
              <Image
                src={e.poster}
                alt=""
                fill
                sizes="(min-width: 1280px) 860px, 100vw"
                className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            ) : null}
            <span className="absolute inset-0 bg-gradient-to-t from-navy/70 to-transparent" aria-hidden />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Play className="ml-0.5 h-6 w-6 fill-navy text-navy" strokeWidth={1.5} aria-hidden />
            </span>
          </button>
        )
      ) : (
        <div className="flex aspect-[1600/906] w-full flex-col items-center justify-center gap-3 bg-wash">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-white">
            <Play className="ml-0.5 h-5 w-5 text-faint" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="font-roman text-[12px] uppercase tracking-widest text-faint">
            Film coming soon
          </span>
        </div>
      )}

      <p className="px-5 py-4 text-[14px] leading-relaxed text-muted sm:px-6">{e.blurb}</p>
    </article>
  );
}
