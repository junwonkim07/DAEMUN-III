"use client";
/**
 * Draggable page scrollbar — adapted from skiper-ui skiper1 (Anime js scrollbar).
 * Fixed pill, 40 tick bars, click-to-jump, ghost cursor, draggable handle.
 * (Demo ScrollCard and sample sections stripped; handle in the site gold.)
 */
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useScroll,
  useTransform,
} from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import useMeasure from "react-use-measure";

export function AnimeScrollbar() {
  const { scrollYProgress } = useScroll();
  const [scrollBarWrapperRef, bounds] = useMeasure();
  const translateX = useTransform(
    scrollYProgress,
    [0, 1],
    [0, bounds.width - 1.5],
  );
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPosition, setGhostPosition] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const scrollBarRef = useRef(null);
  const dragControls = useDragControls();

  const handleX = useMotionValue(0);

  useEffect(() => {
    if (!isDragging) {
      const unsubscribe = translateX.on("change", (v) => handleX.set(v));
      return () => unsubscribe();
    }
  }, [isDragging, translateX, handleX]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setGhostPosition(-20);
      return;
    }
    if (scrollBarRef.current) {
      const relativeX = Math.max(
        0,
        Math.min(e.clientX - bounds.left, bounds.width - 6),
      );
      setGhostPosition(relativeX);
    }
  };

  const handleScrollBarClick = (e: React.MouseEvent) => {
    if (!scrollBarRef.current || isDragging) return;
    const clickX = e.clientX - bounds.left;
    const relativePosition = Math.max(0, Math.min(1, clickX / bounds.width));
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: scrollableHeight * relativePosition,
      behavior: "instant",
    });
  };

  const handleDrag = (
    event: MouseEvent,
    info: { point: { x: number; y: number } },
  ) => {
    event.preventDefault();
    if (!scrollBarRef.current) return;
    const barWidth = bounds.width;
    const dragX = Math.max(0, Math.min(info.point.x - bounds.left, barWidth));
    handleX.set(dragX);
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: scrollableHeight * (dragX / barWidth),
      behavior: "instant",
    });
  };

  const scrollbarBars = useMemo(
    () =>
      [...Array(40)].map((_, item) => (
        <motion.div
          key={item}
          initial={{ opacity: 0.2, filter: "blur(1px)" }}
          animate={{
            opacity: item % 5 === 0 ? 1 : 0.2,
            filter: "blur(0px)",
          }}
          transition={{
            duration: 0.2,
            delay: item % 5 === 0 ? (item / 5) * 0.05 : 0,
            ease: "easeOut",
          }}
          className="h-[15px] w-[1px] bg-ink"
        />
      )),
    [],
  );

  return (
    <div className="fixed bottom-5 right-1/2 z-40 translate-x-1/2 flex-col overflow-hidden rounded-2xl sm:right-24 sm:translate-x-0">
      <motion.div className="cursor-grab rounded-xl border border-line bg-white px-5 shadow-sm will-change-transform">
        <div ref={scrollBarWrapperRef}>
          <div
            className="relative flex h-[40px] items-center justify-center gap-1.5 overflow-hidden rounded-xl"
            ref={scrollBarRef}
            onClick={handleScrollBarClick}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
          >
            {scrollbarBars}

            <AnimatePresence mode="popLayout">
              {isHovering && !isDragging && (
                <motion.div
                  className="absolute h-[24px] w-1.5 cursor-grab rounded-full bg-gold opacity-30"
                  style={{ left: ghostPosition, willChange: "transform" }}
                  transition={{ type: "tween", duration: 0 }}
                />
              )}
            </AnimatePresence>

            <motion.div
              layout
              drag="x"
              dragControls={dragControls}
              dragConstraints={scrollBarRef}
              dragElastic={0}
              dragMomentum={false}
              onDragStart={() => setIsDragging(true)}
              onDrag={handleDrag}
              onDragEnd={() => setIsDragging(false)}
              className="absolute left-0 h-[24px] w-1.5 cursor-grab rounded-full bg-gold active:cursor-grabbing"
              style={{ x: handleX }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
