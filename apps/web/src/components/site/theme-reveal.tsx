"use client";
/**
 * Word-by-word text reveal — adapted from skiper-ui skiper70 (TextBoxReveal).
 * Keeps skiper70's look (a solid box that dissolves into each word) but plays
 * ONCE when the block scrolls into view, then stays put in normal flow —
 * no sticky scroll-jacking. A whole phrase can be highlighted.
 */
import { motion, useInView } from "framer-motion";
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

const STEP = 0.045; // seconds between words
const WORD = 0.55; // seconds per word (box in → box out / text in)

export function ThemeReveal({
  paragraphs,
  highlight,
  className,
}: {
  paragraphs: string[];
  highlight?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });

  const lines = paragraphs.map((p) => p.split(/\s+/).filter(Boolean));
  const allWords = lines.flat();
  const highlighted = phraseIndices(allWords, highlight);

  let offset = 0;
  return (
    <div ref={ref} className="mx-auto w-full max-w-4xl px-5 py-24 sm:px-8 md:py-32">
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
                  play={inView}
                  delay={(start + wi) * STEP}
                  highlighted={highlighted.has(start + wi)}
                >
                  {word}
                </AnimatedWord>
              ))}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedWord({
  children,
  play,
  delay,
  highlighted,
}: {
  children: React.ReactNode;
  play: boolean;
  delay: number;
  highlighted: boolean;
}) {
  return (
    <motion.span
      className={cn("relative mx-1 inline-block text-ink lg:mx-1.5", highlighted && "text-gold")}
      initial={{ opacity: 0 }}
      animate={play ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: WORD * 0.5, delay, ease: "easeOut" }}
    >
      <motion.span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-1/2 h-[80%] w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-ink",
          highlighted && "bg-gold",
        )}
        initial={{ opacity: 1 }}
        animate={play ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: WORD * 0.4, delay: delay + WORD * 0.5, ease: "easeOut" }}
      />
      <motion.span
        className="relative z-10"
        initial={{ opacity: 0 }}
        animate={play ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: WORD * 0.4, delay: delay + WORD * 0.5, ease: "easeOut" }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}
