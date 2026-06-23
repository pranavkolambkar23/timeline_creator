"use client";

import { useMemo, useRef, useState } from "react";
import HistoricalDateBadges from "./HistoricalDateBadges";
import MobileImageViewer from "./MobileImageViewer";

type MediaItem = {
  id?: string;
  url: string;
  type: "image" | "audio";
  size?: number;
  title?: string;
};

type TimelineEvent = {
  id?: string;
  title: string;
  description: string;
  displayDate: string;
  datePrecision?: string | null;
  isApproximate?: boolean | null;
  mediaData?: MediaItem[] | null;
};

const ACCENTS = [
  {
    text: "text-sky-300",
    dot: "bg-sky-400",
    ring: "ring-sky-400/30",
    card: "from-sky-950/95 via-sky-900/80 to-cyan-950/85",
  },
  {
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
    card: "from-emerald-950/95 via-emerald-900/80 to-teal-950/85",
  },
  {
    text: "text-rose-300",
    dot: "bg-rose-400",
    ring: "ring-rose-400/30",
    card: "from-rose-950/95 via-rose-900/80 to-fuchsia-950/85",
  },
  {
    text: "text-indigo-300",
    dot: "bg-indigo-400",
    ring: "ring-indigo-400/30",
    card: "from-indigo-950/95 via-indigo-900/80 to-violet-950/85",
  },
  {
    text: "text-amber-300",
    dot: "bg-amber-400",
    ring: "ring-amber-400/30",
    card: "from-amber-950/95 via-orange-900/80 to-rose-950/80",
  },
];

function getMedia(event: TimelineEvent) {
  return Array.isArray(event.mediaData) ? event.mediaData : [];
}

function getCoverImage(event: TimelineEvent) {
  return getMedia(event).find((media) => media.type === "image" && media.url);
}

function getEventKey(event: TimelineEvent, index: number) {
  return event.id || `${event.displayDate}-${event.title}-${index}`;
}

export default function MobileStoryMode({
  events,
  onRequestHybrid,
}: {
  events: TimelineEvent[];
  onRequestHybrid?: () => void;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [readPhotoIndex, setReadPhotoIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const expandedEvent = expandedIndex !== null ? events[expandedIndex] : null;

  const mediaForExpandedEvent = useMemo(
    () => (expandedEvent ? getMedia(expandedEvent) : []),
    [expandedEvent]
  );
  const imagesForExpandedEvent = useMemo(
    () => mediaForExpandedEvent.filter((media) => media.type === "image" && media.url),
    [mediaForExpandedEvent]
  );
  if (!events.length) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="text-sm font-medium text-foreground/50">
          This timeline does not have any events yet.
        </p>
      </div>
    );
  }

  const goToEvent = (index: number) => {
    setExpandedIndex(Math.max(0, Math.min(events.length - 1, index)));
    setReadPhotoIndex(null);
  };

  const handleReadTouchEnd = (clientX: number, clientY: number) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || expandedIndex === null) return;

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;

    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    goToEvent(expandedIndex + (deltaX < 0 ? 1 : -1));
  };

  return (
    <div className="mobile-story-shell relative flex h-full flex-col overflow-hidden text-white">
      <div className="mobile-story-backdrop pointer-events-none absolute inset-0" />

      <div className="custom-scrollbar relative z-10 flex-1 overflow-y-auto px-4 pb-10 pt-28">
        <div className="mb-9 pl-1 pr-14">
          <p className="mobile-story-kicker text-left text-2xl font-black uppercase leading-none tracking-tight">
            Quick Glance
          </p>
          <p className="mobile-story-subtitle mt-2 text-left text-[10px] font-black uppercase tracking-[0.22em]">
            Tap any event to read
          </p>
        </div>

        <div className="relative">
          <div className="mobile-story-line absolute bottom-5 left-[72px] top-4 w-[2px] rounded-full" />

          <div className="space-y-5">
            {events.map((event, index) => {
              const coverImage = getCoverImage(event);
              const accent = ACCENTS[index % ACCENTS.length];

              return (
                <article
                  key={getEventKey(event, index)}
                  className="relative grid grid-cols-[48px_32px_minmax(0,1fr)] gap-x-2"
                >
                  <div className="flex justify-end pt-8">
                    <time className="mobile-story-date max-w-[48px] text-right text-[12px] font-black leading-tight tracking-tight">
                      {event.displayDate}
                    </time>
                  </div>

                  <div className="relative pt-8">
                    <span
                      className={`mobile-story-dot absolute left-1/2 top-7 z-10 h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[3px] ${accent.dot} shadow-[0_0_18px_rgba(125,211,252,0.5)] ring-4 ${accent.ring}`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedIndex(index)}
                    className="group w-full text-left"
                    aria-label={`Read ${event.title}`}
                  >
                    <div
                      className={`mobile-story-card relative flex min-h-[112px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${accent.card} shadow-xl shadow-black/25 transition duration-200 group-active:scale-[0.985]`}
                    >
                      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-4">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <HistoricalDateBadges
                            isApproximate={event.isApproximate}
                            datePrecision={event.datePrecision}
                            className="text-[9px]"
                          />
                          {getMedia(event).some((media) => media.type === "audio") && (
                            <span className="rounded-full border border-white/10 bg-black/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white/50">
                              Audio
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-[17px] font-black leading-tight tracking-tight text-white">
                          {event.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-[13px] font-medium leading-relaxed text-white/68">
                          {event.description}
                        </p>
                      </div>

                      {coverImage ? (
                        <div className="mobile-story-media-panel relative w-[108px] shrink-0 overflow-hidden bg-black/20">
                          <img
                            src={coverImage.url}
                            alt={coverImage.title || event.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/35 to-transparent" />
                        </div>
                      ) : (
                        <div className="mobile-story-number-panel flex w-[78px] shrink-0 items-center justify-center border-l border-white/10 bg-white/[0.04]">
                          <span className={`text-xl font-black ${accent.text}`}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                </article>
              );
            })}
            {onRequestHybrid && (
              <article className="relative grid grid-cols-[48px_32px_minmax(0,1fr)] gap-x-2 pb-4">
                <div />
                <div className="relative">
                  <span className="mobile-story-dot absolute left-1/2 top-5 z-10 h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[3px] bg-indigo-400 shadow-[0_0_18px_rgba(129,140,248,0.45)] ring-4 ring-indigo-400/25" />
                </div>
                <button
                  type="button"
                  onClick={onRequestHybrid}
                  className="mobile-story-next-mode group rounded-xl border border-indigo-400/25 bg-indigo-500/12 px-4 py-4 text-left shadow-xl shadow-black/10 backdrop-blur transition active:scale-[0.985]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">
                    Timeline complete
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-base font-black leading-tight text-white">
                      Continue in Hybrid Mode
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition group-active:translate-x-0.5">
                      -&gt;
                    </span>
                  </div>
                </button>
              </article>
            )}
          </div>
        </div>
      </div>

      {expandedEvent && expandedIndex !== null && (
        <div
          className="absolute inset-0 z-50 flex flex-col bg-background text-foreground"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            if (touch) handleReadTouchEnd(touch.clientX, touch.clientY);
          }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 bg-background/95 px-5 pb-4 pt-[max(4.25rem,env(safe-area-inset-top))] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setExpandedIndex(null);
                setReadPhotoIndex(null);
              }}
              className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 shadow-sm transition active:scale-95"
            >
              Back to Quick Glance
            </button>
            <span className="text-[9px] font-mono uppercase tracking-widest text-foreground/35">
              {expandedIndex + 1} / {events.length}
            </span>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 pb-10 pt-6">
            <span className={`mb-3 block text-[10px] font-black uppercase tracking-[0.24em] ${ACCENTS[expandedIndex % ACCENTS.length].text}`}>
              {expandedEvent.displayDate}
            </span>
            <HistoricalDateBadges
              isApproximate={expandedEvent.isApproximate}
              datePrecision={expandedEvent.datePrecision}
              className="mb-5"
            />

            <h2 className="text-3xl font-black leading-none tracking-tight text-foreground">
              {expandedEvent.title}
            </h2>
            <div className="my-6 h-px w-12 bg-foreground/20" />
            <p className="whitespace-pre-line text-base font-medium leading-7 text-foreground/68">
              {expandedEvent.description}
            </p>

            {mediaForExpandedEvent.length > 0 && (
              <div className="mt-9 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-foreground/35">
                  Media
                </p>
                {mediaForExpandedEvent.map((media, index) => (
                  <div
                    key={media.id || `${media.url}-${index}`}
                    className="overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.04]"
                  >
                    {media.type === "image" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const imageIndex = imagesForExpandedEvent.findIndex((image) => image.url === media.url);
                          setReadPhotoIndex(Math.max(0, imageIndex));
                        }}
                        className="block w-full text-left"
                        aria-label={`Open ${media.title || expandedEvent.title}`}
                      >
                        <img
                          src={media.url}
                          alt={media.title || expandedEvent.title}
                          className="h-auto w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="p-4">
                        <p className="mb-3 text-[10px] font-mono uppercase tracking-widest text-foreground/45">
                          {media.title || "Audio recording"}
                        </p>
                        <audio controls className="w-full">
                          <source src={media.url} />
                        </audio>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {onRequestHybrid && expandedIndex === events.length - 1 && (
              <button
                type="button"
                onClick={onRequestHybrid}
                className="mobile-story-next-mode mt-9 w-full rounded-xl border border-indigo-400/25 bg-indigo-500/12 px-4 py-4 text-left shadow-xl shadow-black/10 backdrop-blur transition active:scale-[0.985]"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-400">
                  Story complete
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-base font-black leading-tight text-foreground">
                    Continue in Hybrid Mode
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-black text-indigo-500 transition group-active:translate-x-0.5">
                    -&gt;
                  </span>
                </div>
              </button>
            )}
          </div>

          <div className="shrink-0 border-t border-foreground/10 bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToEvent(expandedIndex - 1)}
                disabled={expandedIndex === 0}
                className="text-[10px] font-black uppercase tracking-widest text-foreground/55 disabled:opacity-20"
              >
                Previous
              </button>
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-foreground/35">
                Event {expandedIndex + 1} of {events.length}
              </span>
              <button
                type="button"
                onClick={() => goToEvent(expandedIndex + 1)}
                disabled={expandedIndex === events.length - 1}
                className="text-[10px] font-black uppercase tracking-widest text-foreground/55 disabled:opacity-20"
              >
                Next
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={events.length - 1}
              step={1}
              value={expandedIndex}
              onChange={(event) => goToEvent(Number(event.target.value))}
              className="mobile-story-progress w-full"
              aria-label="Jump to event"
            />
          </div>

          {readPhotoIndex !== null && (
            <MobileImageViewer
              images={imagesForExpandedEvent}
              activeIndex={readPhotoIndex}
              onIndexChange={setReadPhotoIndex}
              onClose={() => setReadPhotoIndex(null)}
              getAlt={(image) => image.title || expandedEvent.title}
            />
          )}
        </div>
      )}
    </div>
  );
}
