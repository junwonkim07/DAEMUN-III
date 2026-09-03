"use client";
/**
 * DAEMUN III homepage composition — adapted from skiper-ui skiper29 (Siena parallax).
 * Same parallax / clip-path video / stacked-headline structure, DAEMUN content.
 */
import { motion, useScroll, useTransform } from "framer-motion";
import ReactLenis from "lenis/react";
import { Cormorant_SC } from "next/font/google";
import Link from "next/link";
import React, { useRef, useState } from "react";

import { VideoPlayer } from "@/components/site/intro-video";
import { ScheduleTimeline } from "@/components/site/schedule-timeline";
import { ThemeReveal } from "@/components/site/theme-reveal";
import type { Conference, ScheduleDayWithItems } from "@daemun/shared";

const cormorantSC = Cormorant_SC({ weight: "600", subsets: ["latin"] });

/** TODO: point at the DAEMUN video channel / playlist once it exists. */
const MORE_VIDEOS_URL = "#";

export function HeroSiena({
  conference,
  schedule,
}: {
  conference: Conference;
  schedule: ScheduleDayWithItems[];
}) {
  const gallery = useRef(null);
  const gallery2 = useRef(null);
  const [playing, setPlaying] = useState(false);

  const { scrollYProgress } = useScroll({
    target: gallery,
    offset: ["start end", "end start"],
  });

  const { scrollYProgress: scrollYProgress2 } = useScroll({
    target: gallery2,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0.6, 1], ["0%", "30%"]);
  const scaleDiv = useTransform(scrollYProgress2, [0, 1], [1, 0.7]);
  const scaleImg = useTransform(scrollYProgress2, [0, 1], [1, 1.3]);

  return (
    <ReactLenis root>
      <div className="flex w-full flex-col items-center overflow-x-clip bg-white text-black">
        {/* ---- Parallax hero image ---- */}
        <div
          ref={gallery}
          className="relative flex h-[70vh] w-full items-end overflow-hidden"
        >
          <div className="absolute left-10 top-10 z-30 flex items-center justify-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-white p-2 text-black">
              <ArrowWeired className="rotate-90" />
            </div>
            <p className="font-roman md:text-md text-xs uppercase tracking-widest text-white">
              {conference.session} · November 2026
            </p>
          </div>
          <div className="absolute left-0 top-0 z-10 h-1/2 w-full bg-gradient-to-t from-transparent to-black/90" />
          <motion.video
            src="/main.mp4"
            poster="/hero-gavel.jpg"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            style={{ y, objectPosition: "50% 30%", scale: 1.15 }}
          />
        </div>

        {/* ---- Title ---- */}
        <div className="flex w-full flex-col items-center justify-center">
          <p className="font-roman md:text-md my-10 text-sm uppercase tracking-widest">
            {conference.org}
          </p>
          <h1
            className={`${cormorantSC.className} w-full border-b border-t py-3 text-center text-5xl uppercase lg:text-8xl`}
            style={{ lineHeight: 1.25 }}
          >
            DAEMUN III
          </h1>
          <div className="my-4 flex size-8 items-center justify-center rounded-full bg-black p-2 text-white">
            <ArrowWeired />
          </div>
        </div>

        {/* ---- Clip-path intro video ---- */}
        <motion.div
          ref={gallery2}
          style={{ scale: scaleDiv, clipPath: "url(#video)" }}
          className="mt-35 relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black lg:w-[80%]"
        >
          {playing ? (
            <div className="absolute inset-0 z-20 h-full w-full">
              <VideoPlayer src="/intro.mp4" poster="/video-poster.jpg" />
            </div>
          ) : (
            <button
              type="button"
              aria-label="Play the introduction film"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 z-20 flex h-full w-full items-center justify-center"
            >
              <div className="absolute z-20 size-full bg-black/15 transition-colors hover:bg-black/25" />
              <PlayBadge />
            </button>
          )}
          <SvgMask />
          {!playing && (
            <motion.img
              src="/video-poster.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ scale: scaleImg }}
            />
          )}
        </motion.div>

        {/* ---- More videos ---- */}
        <div className="mt-6 flex w-full justify-end px-5 sm:px-8 lg:w-[80%] lg:px-0">
          <a
            href={MORE_VIDEOS_URL}
            className="group inline-flex items-center gap-3 border-b border-black/20 py-2 transition-colors hover:border-black"
          >
            <span className="font-roman md:text-md text-sm uppercase tracking-widest">
              Watch more videos
            </span>
            <span className="flex size-7 items-center justify-center rounded-full bg-black p-1.5 text-white transition-transform group-hover:translate-x-1">
              <ArrowWeired className="-rotate-90" />
            </span>
          </a>
        </div>

        {/* ---- Theme: dark photo band (same treatment as the committee intro) ---- */}
        <section id="theme" className="relative mt-32 w-full bg-navy text-white">
          {/* Photo covers one viewport at a time and rides along (sticky), so it is never
              stretched across the whole band. */}
          <div className="absolute inset-0" aria-hidden>
            <div
              className="sticky top-0 h-screen w-full bg-cover bg-center"
              style={{ backgroundImage: "url(/theme-bg.jpg)" }}
            >
              <div className="absolute inset-0 bg-navy/80" />
            </div>
          </div>

          <div className="relative">
            <ThemeReveal
              paragraphs={[conference.themeLead, conference.themeBody]}
              highlight="From Vulnerability to Voice"
              tone="dark"
              header={
                <div className="flex w-full flex-col items-center uppercase">
                  <p className="font-roman md:text-md mb-5 text-sm uppercase tracking-widest text-gold-soft">
                    Theme of DAEMUN III
                  </p>
                  <h1 className="font-custom w-full border-t border-white/30 py-1 text-center text-5xl lg:text-7xl" style={{ lineHeight: 1 }}>
                    From
                  </h1>
                  <h1 className="font-custom w-full border-t border-white/30 py-1 text-center text-5xl lg:text-7xl" style={{ lineHeight: 1 }}>
                    Vulnerability
                  </h1>
                  <h1 className="font-custom w-full border-b border-t border-white/30 py-1 text-center text-5xl lg:text-7xl" style={{ lineHeight: 1 }}>
                    to Voice
                  </h1>
                </div>
              }
            />
          </div>
        </section>

        {/* ---- Conference schedule ---- */}
        {schedule.length > 0 ? (
          <section id="schedule" className="w-full scroll-mt-16">
            <p className="font-roman md:text-md my-10 text-center text-sm uppercase tracking-widest">
              Conference schedule
            </p>
            <h2
              className="font-custom w-full border-b border-t py-1 text-center text-5xl uppercase lg:text-8xl"
              style={{ lineHeight: 1 }}
            >
              Schedule
            </h2>
            <div className="mx-auto max-w-3xl px-5 pb-8 pt-14 sm:px-8 [&_header]:top-12">
              <ScheduleTimeline schedule={schedule} />
            </div>
          </section>
        ) : null}

        {/* ---- Sitemap ---- */}
        <div className="my-42 flex flex-col items-center justify-center uppercase">
          <p className="font-roman md:text-md my-6 text-sm uppercase tracking-widest">
            sitemap
          </p>
          {[
            { label: "Secretariat", href: "/secretariat" },
            { label: "Committees", href: "/committees" },
            { label: "Resolutions", href: "/resolutions" },
            { label: "Guide to MUN", href: "/guide" },
            { label: "Announcements", href: "/announcements" },
            { label: "Contact", href: "/#contact" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="font-custom w-full cursor-pointer text-center text-4xl leading-[0.9] opacity-20 transition-all ease-in-out hover:opacity-100"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </ReactLenis>
  );
}

const SvgMask = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 1836 1053"
    width="100%"
  >
    <clipPath id="video" clipPathUnits="objectBoundingBox">
      <path
        fill="currentColor"
        d="M457.525 1.148c-20.789-3.198-193.979 1.16-283.854 2.496 11.104-.178 1.297-2.868-81.146-2.496-103.5.468-86 102.499-86 109.999s-7 524.5-6.5 547.5 10 59 6.5 99c-2.8 32-1.167 234.667 0 332.003.5 75 62.5 66.5 67 68.5s38.5 0 81.5 0 436 6 526 10.5 438.995-.5 505.495 0 330.01-12.5 417.51-12.5 230.99 2 270.99 0 40.5-16 51-31.5 12.5-61 12.5-105.5c0-44.503 7.01-274.504 7.01-348.004s-3.51-159.998-7.01-230.998 0-256.002 0-318.002 7.01-92.998-22.5-110.999c-18.79-11.471-81.99-9.999-133.49-9.999H853.525c-29 0-370 4-396 0Z"
        transform="scale(0.0005139987561, 0.0008543065594)"
      ></path>
    </clipPath>
  </svg>
);

const ArrowWeired = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 100 100"
    width="100%"
    className={className}
  >
    <path
      fill="currentColor"
      d="M69.022 85.363c16.693-13.32 20.658-33.261 20.16-43.736H77.95c0 17.454-11.106 29.106-20.543 35.517-4.676 3.177-10.818 2.998-15.414-.293-17.124-12.264-19.958-27.753-18.988-35.224H10.305c0 20.438 9.697 34.444 20.244 43.16 11.033 9.118 27.285 9.503 38.473.576Z"
    ></path>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M56.016 5v79.243H43.56V5h12.455Z"
      clipRule="evenodd"
    ></path>
  </svg>
);

const PlayBadge = () => (
  <div className="absolute z-20 flex scale-50 flex-col items-center justify-center gap-3 text-center text-white lg:scale-100">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 100 100"
      width="100%"
      className="svg size-25"
    >
      <path
        fill="currentColor"
        d="M80.593 43.765c4.543 3.072 4.543 9.762 0 12.834L28.219 92.021c-5.145 3.48-12.087-.206-12.087-6.417V14.76c0-6.21 6.942-9.897 12.087-6.417l52.374 35.422Z"
      ></path>
    </svg>
    <p className="font-roman md:text-md text-sm uppercase tracking-widest">
      Introduction
    </p>
    <h1 className="font-custom text-4xl uppercase leading-[0.9]">
      watch <br /> the film
    </h1>
  </div>
);
