"use client";

import { WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import HistoricalDateBadges from "./HistoricalDateBadges";

type MediaItem = {
  id?: string;
  url: string;
  type: "image" | "audio";
  size?: number;
  title?: string;
};

type Event = {
  id: string;
  title: string;
  description: string;
  date: string | Date;
  displayDate: string;
  datePrecision?: string | null;
  isApproximate?: boolean | null;
  mediaData?: MediaItem[];
};

const ACCENTS = [
  {
    text: "text-sky-300",
    activeText: "text-sky-500 dark:text-sky-300",
    dot: "bg-sky-400",
    ring: "ring-sky-400/30",
    line: "from-sky-400 via-cyan-400 to-emerald-400",
    card: "from-sky-950 via-sky-900 to-cyan-950",
    border: "border-sky-300/50",
    shadow: "shadow-sky-500/20",
  },
  {
    text: "text-emerald-300",
    activeText: "text-emerald-500 dark:text-emerald-300",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
    line: "from-emerald-400 via-teal-400 to-rose-400",
    card: "from-emerald-950 via-emerald-900 to-teal-950",
    border: "border-emerald-300/50",
    shadow: "shadow-emerald-500/20",
  },
  {
    text: "text-rose-300",
    activeText: "text-rose-500 dark:text-rose-300",
    dot: "bg-rose-400",
    ring: "ring-rose-400/30",
    line: "from-rose-400 via-fuchsia-400 to-indigo-400",
    card: "from-rose-950 via-rose-900 to-fuchsia-950",
    border: "border-rose-300/50",
    shadow: "shadow-rose-500/20",
  },
  {
    text: "text-indigo-300",
    activeText: "text-indigo-500 dark:text-indigo-300",
    dot: "bg-indigo-400",
    ring: "ring-indigo-400/30",
    line: "from-indigo-400 via-violet-400 to-amber-400",
    card: "from-indigo-950 via-indigo-900 to-violet-950",
    border: "border-indigo-300/50",
    shadow: "shadow-indigo-500/20",
  },
  {
    text: "text-amber-300",
    activeText: "text-amber-500 dark:text-amber-300",
    dot: "bg-amber-400",
    ring: "ring-amber-400/30",
    line: "from-amber-400 via-orange-400 to-sky-400",
    card: "from-amber-950 via-orange-900 to-rose-950",
    border: "border-amber-300/50",
    shadow: "shadow-amber-500/20",
  },
];

function getMedia(event: Event) {
  return Array.isArray(event.mediaData) ? event.mediaData : [];
}

function getCoverImage(event: Event) {
  return getMedia(event).find((media) => media.type === "image" && media.url);
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(length - 1, index));
}

export default function HorizontalTimeline({
  events,
  timelineTitle,
}: {
  events: Event[];
  timelineTitle: string;
}) {
  const cardScrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [readIndex, setReadIndex] = useState<number | null>(null);

  const readEvent = readIndex !== null ? events[readIndex] : null;
  const readMedia = useMemo(() => (readEvent ? getMedia(readEvent) : []), [readEvent]);

  const readProgress = readIndex === null || events.length <= 1 ? 0 : (readIndex / (events.length - 1)) * 100;

  const goToEvent = (index: number, openReadMode = false) => {
    if (events.length === 0) return;
    const nextIndex = clampIndex(index, events.length);
    setActiveIndex(nextIndex);
    if (openReadMode) setReadIndex(nextIndex);

    const card = cardRefs.current[nextIndex];
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const syncActiveEventFromScroll = () => {
    const scroller = cardScrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const edgeTolerance = 16;
    if (scroller.scrollLeft <= edgeTolerance) {
      setActiveIndex((currentIndex) => (currentIndex === 0 ? currentIndex : 0));
      return;
    }
    if (maxScrollLeft - scroller.scrollLeft <= edgeTolerance) {
      const lastIndex = events.length - 1;
      setActiveIndex((currentIndex) => (currentIndex === lastIndex ? currentIndex : lastIndex));
      return;
    }

    const scrollerRect = scroller.getBoundingClientRect();
    const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;
    let closestIndex = activeIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const distance = Math.abs(cardCenter - scrollerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex((currentIndex) => (currentIndex === closestIndex ? currentIndex : closestIndex));
  };

  const handleCardScroll = () => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      syncActiveEventFromScroll();
    });
  };

  const handleCardWheel = (event: WheelEvent<HTMLDivElement>) => {
    const scroller = cardScrollerRef.current;
    if (!scroller || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

    event.preventDefault();
    scroller.scrollBy({
      left: event.deltaY,
      behavior: "auto",
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToEvent((readIndex ?? activeIndex) - 1, readIndex !== null);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToEvent((readIndex ?? activeIndex) + 1, readIndex !== null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, events.length, readIndex]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  if (!events.length) {
    return (
      <div className="flex h-full items-center justify-center bg-background px-8 text-center">
        <p className="text-sm font-medium text-foreground/50">This timeline does not have any events yet.</p>
      </div>
    );
  }

  if (readEvent && readIndex !== null) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-background text-foreground">
        <header className="flex shrink-0 items-center justify-between border-b border-foreground/10 bg-background/95 px-8 py-5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setReadIndex(null)}
            className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 transition active:scale-95"
          >
            Back to Quick Glance
          </button>
          <div className="min-w-0 px-6 text-center">
            <h2 className="truncate text-sm font-black uppercase tracking-[0.2em] text-foreground/70">
              {timelineTitle}
            </h2>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-foreground/35">
            {readIndex + 1} / {events.length}
          </span>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-10 pb-8 pt-5">
          <article className={`mx-auto grid h-full max-w-7xl gap-10 ${readMedia.length > 0 ? "grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)]" : "grid-cols-1"}`}>
            <div className="min-h-0">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">
                {readEvent.displayDate}
              </p>
              <HistoricalDateBadges
                isApproximate={readEvent.isApproximate}
                datePrecision={readEvent.datePrecision}
                className="mb-4"
              />
              <h1 className={`${readMedia.length > 0 ? "max-w-4xl" : "max-w-5xl"} text-5xl font-black leading-[0.92] tracking-tighter text-foreground xl:text-6xl`}>
                {readEvent.title}
              </h1>
              <div className="my-6 h-px w-24 bg-indigo-500/70" />
              <div className={`custom-scrollbar overflow-y-auto pr-6 ${readMedia.length > 0 ? "max-h-[46vh]" : "max-h-[50vh]"}`}>
                <p className="whitespace-pre-line text-lg font-medium leading-8 text-foreground/68">
                  {readEvent.description}
                </p>
              </div>
            </div>

            {readMedia.length > 0 && (
              <aside className="custom-scrollbar min-h-0 overflow-y-auto rounded-2xl border border-foreground/10 bg-card/70 p-4">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-foreground/38">
                  Event Media
                </p>
                <div className="space-y-4">
                  {readMedia.map((media, index) => (
                    <div
                      key={media.id || `${media.url}-${index}`}
                      className="overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.04]"
                    >
                      {media.type === "image" ? (
                        <img
                          src={media.url}
                          alt={media.title || readEvent.title}
                          className="max-h-[360px] w-full object-contain"
                        />
                      ) : media.type === "audio" ? (
                        <div className="p-4">
                          <p className="mb-3 text-[10px] font-mono uppercase tracking-widest text-foreground/45">
                            {media.title || "Audio recording"}
                          </p>
                          <audio controls className="w-full">
                            <source src={media.url} />
                          </audio>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </aside>
            )}
          </article>
        </div>

        <footer className="shrink-0 border-t border-foreground/10 bg-background/95 px-8 py-2.5 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl">
            <div className="mb-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToEvent(readIndex - 1, true)}
                disabled={readIndex === 0}
                className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-foreground/55 transition hover:bg-foreground/5 disabled:opacity-20"
              >
                Previous
              </button>
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-foreground/35">
                Event {readIndex + 1} of {events.length}
              </span>
              <button
                type="button"
                onClick={() => goToEvent(readIndex + 1, true)}
                disabled={readIndex === events.length - 1}
                className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-foreground/55 transition hover:bg-foreground/5 disabled:opacity-20"
              >
                Next
              </button>
            </div>
            <div className="relative py-0.5">
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full border border-foreground/10 bg-foreground/[0.055] shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-500 shadow-[0_0_18px_rgba(99,102,241,0.28)] transition-all"
                  style={{ width: `${readProgress}%` }}
                />
              </div>
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2">
                {events.map((event, index) => {
                  const isReached = index <= readIndex;
                  const position = events.length <= 1 ? 0 : (index / (events.length - 1)) * 100;
                  return (
                    <span
                      key={event.id}
                      className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border transition ${
                        isReached
                          ? "border-white/80 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.45)]"
                          : "border-foreground/15 bg-background"
                      }`}
                      style={{ left: `${position}%` }}
                    />
                  );
                })}
              </div>
              <div
                className="pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 transition-all"
                style={{ left: `${readProgress}%` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <input
                type="range"
                min={0}
                max={events.length - 1}
                step={1}
                value={readIndex}
                onChange={(event) => goToEvent(Number(event.target.value), true)}
                className="relative z-10 h-5 w-full cursor-grab opacity-0 active:cursor-grabbing"
                aria-label="Jump to event"
              />
            </div>
          </div>
        </footer>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 px-10 pb-5 pt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-indigo-500">Story Mode</p>
        <div className="mt-2 flex items-end justify-between gap-8">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black tracking-tight text-foreground">{timelineTitle}</h1>
            <p className="mt-2 text-sm font-medium text-foreground/45">
              Quick Glance. Select an event to open Read Mode.
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.24em] text-foreground/35">
            {activeIndex + 1} / {events.length}
          </span>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <button
          type="button"
          onClick={() => goToEvent(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="absolute left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-card/90 text-foreground shadow-xl transition hover:bg-indigo-600 hover:text-white disabled:pointer-events-none disabled:opacity-20"
          aria-label="Previous event"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => goToEvent(activeIndex + 1)}
          disabled={activeIndex === events.length - 1}
          className="absolute right-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/10 bg-card/90 text-foreground shadow-xl transition hover:bg-indigo-600 hover:text-white disabled:pointer-events-none disabled:opacity-20"
          aria-label="Next event"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div
          ref={cardScrollerRef}
          onScroll={handleCardScroll}
          onWheel={handleCardWheel}
          className="no-scrollbar h-full overflow-x-auto px-24 pb-10 pt-2 scroll-smooth"
        >
          <div className="min-w-max">
            <div className="relative h-24">
              <div className="relative z-10 flex gap-5">
                {events.map((event, index) => {
                  const isActive = index === activeIndex;
                  const isPast = index <= activeIndex;
                  const isCompletedSegment = index < activeIndex;
                  const accent = ACCENTS[index % ACCENTS.length];

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => goToEvent(index)}
                      className="group relative flex w-[460px] shrink-0 flex-col items-center"
                      aria-label={`Go to ${event.title}`}
                    >
                      {index < events.length - 1 && (
                        <span
                          className={`absolute left-1/2 top-[9px] h-[3px] w-[480px] rounded-full bg-gradient-to-r ${
                            isCompletedSegment ? accent.line : "from-foreground/12 to-foreground/12"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`relative z-10 flex h-5 w-5 rounded-full border-[3px] ring-4 transition ${
                          isActive
                            ? `border-white ${accent.dot} ${accent.ring} shadow-[0_0_18px_rgba(125,211,252,0.5)]`
                            : isPast
                              ? `border-white/80 ${accent.dot} ${accent.ring}`
                              : "border-foreground/20 bg-background ring-foreground/5 group-hover:border-foreground/45"
                        }`}
                      />
                      <span className={`mt-4 max-w-[18rem] truncate text-[11px] font-black uppercase tracking-wider ${isActive ? accent.activeText : "text-foreground/42"}`}>
                        {event.displayDate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-5">
              {events.map((event, index) => {
                const coverImage = getCoverImage(event);
                const isActive = index === activeIndex;
                const accent = ACCENTS[index % ACCENTS.length];

                return (
              <button
                key={event.id}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setReadIndex(index);
                }}
                className={`group h-[250px] w-[460px] shrink-0 overflow-hidden rounded-2xl border text-left shadow-xl transition ${
                  isActive
                    ? `${accent.border} opacity-100 ${accent.shadow}`
                    : "border-foreground/10 opacity-90 hover:opacity-100 dark:opacity-72"
                }`}
              >
                <div className={`flex h-full bg-gradient-to-br ${accent.card}`}>
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/65">
                        {event.displayDate}
                      </span>
                      <HistoricalDateBadges
                        isApproximate={event.isApproximate}
                        datePrecision={event.datePrecision}
                        className="text-[9px]"
                      />
                    </div>
                    <h3 className="line-clamp-3 pb-0.5 text-[1.42rem] font-black leading-[1.08] tracking-tight text-white">
                      {event.title}
                    </h3>
                    <p className="mt-3 line-clamp-4 text-sm font-medium leading-6 text-white/68">
                      {event.description}
                    </p>
                  </div>

                  {coverImage ? (
                    <div className="relative w-[170px] shrink-0 overflow-hidden bg-black/20">
                      <img
                        src={coverImage.url}
                        alt={coverImage.title || event.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/35 to-transparent" />
                    </div>
                  ) : (
                    <div className="flex w-[132px] shrink-0 items-center justify-center border-l border-white/10 bg-white/[0.05]">
                      <span className={`text-5xl font-black ${accent.text}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                </div>
              </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
