"use client";

import { AnimatePresence, motion, useSpring } from "framer-motion";
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToHoverCapability(onChange: () => void) {
  const mq = window.matchMedia(HOVER_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getHoverCapability() {
  return window.matchMedia(HOVER_QUERY).matches;
}

function getServerHoverCapability() {
  // SSR: unknown until hydration. null = "not yet determined", matching the
  // existing render logic below.
  return null;
}

/**
 * MemberHoverList — vertical editorial name list with a cursor-following
 * portrait on hover. Motion pattern adapted from skiper-ui skiper6
 * (HoverMember): spring-driven x/y/scale follower.
 */

const SPRING = { mass: 0.1, damping: 16, stiffness: 71 };
const PORTRAIT_W = 160;
const PORTRAIT_H = 200;

export interface MemberHoverPerson {
  name: string;
  role: string;
  photo?: string | null;
}

export function MemberHoverList({ people }: { people: MemberHoverPerson[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // null = not yet determined (SSR / pre-hydration): render as hover-capable,
  // since the floating portrait only mounts after this resolves to true.
  // matchMedia is an external system, so this reads it via
  // useSyncExternalStore instead of effect+setState (avoids
  // react-hooks/set-state-in-effect and stays hydration-safe).
  const canHover = useSyncExternalStore(
    subscribeToHoverCapability,
    getHoverCapability,
    getServerHoverCapability,
  );

  // Cursor-following springs (skiper6 pattern)
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);
  const scale = useSpring(0, { mass: 0.1, damping: 10, stiffness: 150 });

  const hovered = hoveredIndex === null ? null : people[hoveredIndex];
  const portraitPhoto =
    canHover === true && hovered && hovered.photo ? hovered.photo : null;

  useEffect(() => {
    scale.set(portraitPhoto ? 1 : 0);
  }, [portraitPhoto, scale]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const bounds = el.getBoundingClientRect();
    const halfW = PORTRAIT_W / 2;
    // Clamp horizontally so the portrait never spills past the container
    // (prevents page-level horizontal overflow).
    const px = Math.min(
      Math.max(event.clientX - bounds.left, halfW),
      Math.max(bounds.width - halfW, halfW),
    );
    const py = event.clientY - bounds.top;
    x.set(px - halfW);
    y.set(py - PORTRAIT_H / 2);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onPointerMove={canHover === true ? handlePointerMove : undefined}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      <ul className="border-t border-line">
        {people.map((person, index) => (
          <li key={person.name + "-" + index} className="border-b border-line">
            <div
              className="group flex items-center justify-between gap-4 py-4 md:py-5"
              onPointerEnter={() => setHoveredIndex(index)}
            >
              <span className="flex min-w-0 items-center gap-3">
                {canHover === false && person.photo ? (
                  <img
                    src={person.photo}
                    alt={person.name}
                    className="h-10 w-10 shrink-0 rounded-sm border border-line object-cover"
                  />
                ) : null}
                <span className="select-none text-2xl leading-tight text-ink transition-[color,transform] duration-300 md:text-4xl md:group-hover:translate-x-2 md:group-hover:text-brand">
                  {person.name}
                </span>
              </span>
              <span
                className={
                  "shrink-0 text-right text-sm md:text-base " +
                  (/head/i.test(person.role) ? "text-gold" : "text-muted")
                }
              >
                {person.role}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Cursor-following portrait (hover-capable devices only) */}
      {canHover === true ? (
        <motion.div
          aria-hidden="true"
          style={{ x, y, scale, width: PORTRAIT_W, height: PORTRAIT_H }}
          className="pointer-events-none absolute left-0 top-0 z-20"
        >
          <AnimatePresence>
            {portraitPhoto ? (
              <motion.img
                key={portraitPhoto}
                src={portraitPhoto}
                alt=""
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute inset-0 h-full w-full rounded-sm border border-line bg-wash object-cover shadow-sm"
              />
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </div>
  );
}
