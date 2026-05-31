"use client";

import { useRef, useState } from "react";

type TimelineEvent = {
  id: string;
  title: string;
  description: string;
  displayDate: string;
};

export default function MobileStoryMode({ events }: { events: TimelineEvent[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const activeEvent = events[activeIndex];

  const selectEvent = (index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), events.length - 1));
  };

  if (!activeEvent) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="text-sm font-medium text-foreground/50">This timeline does not have any events yet.</p>
      </div>
    );
  }

  return (
    <section
      className="flex h-full flex-col overflow-hidden bg-background"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const touchEndX = event.changedTouches[0]?.clientX;
        if (touchStartX.current === null || touchEndX === undefined) return;

        const swipeDistance = touchEndX - touchStartX.current;
        if (swipeDistance < -50) selectEvent(activeIndex + 1);
        if (swipeDistance > 50) selectEvent(activeIndex - 1);
        touchStartX.current = null;
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-20">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">
            {activeEvent.displayDate}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">
            {activeIndex + 1} / {events.length}
          </span>
        </div>

        <h2 className="text-4xl font-black leading-[0.95] tracking-tighter text-foreground">
          {activeEvent.title}
        </h2>

        <div className="my-7 h-px w-16 bg-indigo-500/70" />

        <p className="whitespace-pre-line text-base font-medium leading-7 text-foreground/65">
          {activeEvent.description}
        </p>
      </div>

      <div className="border-t border-foreground/10 bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
              {activeEvent.displayDate}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-foreground">{activeEvent.title}</p>
          </div>
          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-foreground/30">
            Swipe pages
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(events.length - 1, 0)}
          value={activeIndex}
          onChange={(event) => selectEvent(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-indigo-500"
          aria-label="Select timeline event"
        />

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => selectEvent(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="text-[10px] font-black uppercase tracking-widest text-foreground/50 disabled:opacity-20"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => selectEvent(activeIndex + 1)}
            disabled={activeIndex === events.length - 1}
            className="text-[10px] font-black uppercase tracking-widest text-foreground/50 disabled:opacity-20"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
