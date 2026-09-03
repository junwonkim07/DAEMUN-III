"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { TBA } from "@/components/site/section";

type ScheduleItem = { time: string; event: string };
type ScheduleDay = { day: string; date: string; items: ScheduleItem[] };

/**
 * Conference schedule with the skiper74 scroll-reveal timeline feel: a sticky
 * day header that slides in a new label as each day's section scrolls past the
 * trigger line near the top of the viewport.
 */
export function ScheduleTimeline({ schedule }: { schedule: ScheduleDay[] }) {
  const [current, setCurrent] = useState<ScheduleDay | undefined>(schedule[0]);

  if (schedule.length === 0) return null;

  return (
    <div className="w-full">
      <header className="sticky top-0 z-10 border-b border-line bg-white pb-3 pt-4">
        {current ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <motion.span
              key={current.day}
              initial={{ x: -6, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="inline-block text-[30px] leading-none tracking-[-0.01em] text-ink sm:text-[38px]"
            >
              {current.day}
            </motion.span>
            <span className="text-[15px] text-muted sm:text-[17px]">
              <TBA value={current.date} />
            </span>
          </div>
        ) : null}
      </header>

      <div>
        {schedule.map((day) => (
          <DaySection key={day.day} data={day} onEnter={setCurrent} />
        ))}
      </div>
    </div>
  );
}

function DaySection({
  data,
  onEnter,
}: {
  data: ScheduleDay;
  onEnter: (day: ScheduleDay) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  // Shrinks the intersection root to a thin band near the top of the viewport,
  // so exactly one day "owns" the sticky header at a time (skiper74 mechanic).
  const inView = useInView(sectionRef, {
    amount: 0,
    margin: "-20% 0px -79% 0px",
  });

  useEffect(() => {
    if (inView) onEnter(data);
  }, [inView, data, onEnter]);

  return (
    <section ref={sectionRef} className="py-10 sm:py-12">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
        <h3 className="text-[20px] text-ink sm:text-[22px]">{data.day}</h3>
        <span className="text-[15px] text-muted sm:text-[16px]">
          <TBA value={data.date} />
        </span>
      </header>

      <ul>
        {data.items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-4 border-b border-line py-5 last:border-b-0 sm:gap-6"
          >
            <span
              aria-hidden
              className="mt-[11px] size-2.5 shrink-0 rounded-full border border-line bg-wash"
            />
            <span className="w-[104px] shrink-0 text-[16px] leading-8 text-muted tabular-nums sm:w-36 sm:text-[17px]">
              <TBA value={item.time} />
            </span>
            <span className="min-w-0 text-[19px] leading-8 text-body sm:text-[21px]">{item.event}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
