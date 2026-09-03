"use client";
/**
 * Scroll-driven word-by-word reveal — adapted from skiper-ui skiper70
 * (TextBoxReveal). Same mechanism as the original: a tall section with a
 * sticky viewport-height stage; each word's box dissolves into text as the
 * page scrolls, so the reveal follows the reader's scroll position.
 * Differences: a whole phrase can be highlighted, copy comes in as
 * paragraphs, and a dark tone for photo bands.
 */
import { motion, type MotionValue, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";

import { cn } from "@/lib/utils";

const norm = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Indices of every word that belongs to an occurrence of `phrase`. */
function phraseIndices(words: string[], phrase?: string): Set<number> {
  const hit = new Set<number>();
  if (!phrase) return hit;
  const target = phrase.split(/\s+/).map(norm).filter(Boolean);
  const flat = words.map(norm);
  for (let i = 0; i + target.length <= flat.length; i++) {
    if (target.every((t, k) => flat[i + k] === t)) {
      for (let k = 0; k < target.length; k++) hit.add(i + k);
    }
  }
  return hit;
}

export function ThemeReveal({
  paragraphs,
  highlight,
  className,
  tone = "light",
}: {
  paragraphs: string[];
  highlight?: string;
  className?: string;
  /** "dark" = white text on a dark band */
  tone?: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const lines = paragraphs.map((p) => p.split(/\s+/).filter(Boolean));
  const allWords = lines.flat();
  const highlighted = phraseIndices(allWords, highlight);
  const dark = tone === "dark";

  let offset = 0;
  return (
    <div ref={containerRef} className="relative z-0 h-[300vh]">
      <div className="sticky top-0 mx-auto flex h-screen max-w-4xl items-center px-5 py-20 sm:px-8">
        <div
          className={cn(
            "flex flex-col gap-10 text-2xl leading-[1.35] tracking-tight md:text-3xl lg:text-4xl",
            className,
          )}
        >
          {lines.map((words, li) => {
            const start = offset;
            offset += words.length;
            return (
              <p key={li} className="flex flex-wrap">
                {words.map((word, wi) => (
                  <AnimatedWord
                    key={`${li}-${wi}`}
                    progress={scrollYProgress}
                    wordIndex={start + wi}
                    totalWords={allWords.length}
                    highlighted={highlighted.has(start + wi)}
                    dark={dark}
                  >
                    {word}
                  </AnimatedWord>
                ))}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnimatedWord({
  children,
  progress,
  wordIndex,
  totalWords,
  highlighted,
  dark,
}: {
  children: React.ReactNode;
  progress: MotionValue<number>;
  wordIndex: number;
  totalWords: number;
  highlighted: boolean;
  dark: boolean;
}) {
  // skiper70 timing: each word's window overlaps the next 15 words
  const overlapWords = 15;
  const wordStart = wordIndex / totalWords;
  const wordEnd = wordStart + overlapWords / totalWords;
  const timelineScale = 1 / (1 + overlapWords / totalWords);
  const s = wordStart * timelineScale;
  const e = wordEnd * timelineScale;
  const d = e - s;

  const opacity = useTransform(progress, [s, e], [0, 1]);
  const bgOpacity = useTransform(progress, [s + d * 0.9, e], [1, 0]);
  const textOpacity = useTransform(progress, [s + d * 0.9, e], [0, 1]);

  return (
    <motion.span
      className={cn(
        "relative mx-1 inline-block lg:mx-1.5",
        dark ? "text-white" : "text-ink",
        highlighted && (dark ? "text-gold-soft" : "text-gold"),
      )}
      style={{ opacity }}
    >
      <motion.span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-1/2 h-[80%] w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-md",
          dark ? "bg-white/90" : "bg-ink",
          highlighted && (dark ? "bg-gold-soft" : "bg-gold"),
        )}
        style={{ opacity: bgOpacity }}
      />
      <motion.span className="relative z-10" style={{ opacity: textOpacity }}>
        {children}
      </motion.span>
    </motion.span>
  );
}
