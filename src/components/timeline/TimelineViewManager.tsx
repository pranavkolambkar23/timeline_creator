"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import HorizontalTimeline from "./HorizontalTimeline";
import VerticalTimelineWithMap from "./VerticalTimelineWithMap";
import FullMapView from "./FullMapView";
import ViewerTour from "@/components/ViewerTour";
import AdminControls from "@/components/AdminControls";
import MobileStoryMode from "./MobileStoryMode";

interface TimelineViewManagerProps {
  timeline: {
    id: string;
    title: string;
    description: string;
    category: string;
    coverImage?: string | null;
    coverImagePosition?: { x: number; y: number };
    coverImageZoom?: number;
    tags: string[];
    events: any[];
    isFeatured: boolean;
    userId: string;
  };
  isAdmin: boolean;
  onExitPreview?: () => void;
  onCoverImagePositionChange?: (position: { x: number; y: number }) => void;
  onCoverImageZoomChange?: (zoom: number) => void;
}

type ViewMode = 'overview' | 'story' | 'hybrid' | 'map';
type MobileViewMode = 'overview' | 'story' | 'hybrid' | 'map';

const VIEW_MODES: { id: ViewMode; label: string; hint: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', hint: 'Timeline details', icon: 'M4 5h16M4 12h10M4 19h16' },
  { id: 'story', label: 'Story', hint: 'Horizontal read', icon: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 22V4.5zM8 6h8M8 10h6' },
  { id: 'hybrid', label: 'Hybrid', hint: 'Events and map', icon: 'M4 4h5v16H4V4zm8 0h8v16h-8V4z' },
  { id: 'map', label: 'Explorer Mode', hint: 'Spatial view', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9' },
];

function DraggableCoverImage({
  imageUrl,
  position,
  onPositionChange,
  zoom,
  onZoomChange,
  className,
  showHint = false,
}: {
  imageUrl: string;
  position: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
  className: string;
  showHint?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosition: { x: number; y: number };
    width: number;
    height: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const zoomRef = useRef(zoom);

  const canDrag = Boolean(onPositionChange);
  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
  const clampZoom = (value: number) => Math.max(0.35, Math.min(5, value));
  const setZoom = (nextZoom: number) => onZoomChange?.(clampZoom(nextZoom));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canDrag || !frameRef.current || !isEditing) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = frameRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPosition: position,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !onZoomChange || !isEditing) return;

    const onWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setZoom(zoomRef.current + (event.deltaY < 0 ? 0.08 : -0.08));
    };

    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [isEditing, onZoomChange]);

  useEffect(() => {
    if (!isDragging) return;

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !onPositionChange) return;

      event.preventDefault();
      onPositionChange({
        x: clampPercent(drag.startPosition.x + ((event.clientX - drag.startX) / drag.width) * 100),
        y: clampPercent(drag.startPosition.y + ((event.clientY - drag.startY) / drag.height) * 100),
      });
    };

    const onPointerUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDragging, onPositionChange]);

  const translateX = position.x - 50;
  const translateY = position.y - 50;

  return (
    <div
      ref={frameRef}
      className={`${className} ${canDrag && isEditing ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
      onPointerDown={onPointerDown}
      title={canDrag ? (isEditing ? "Drag to reposition cover image. Scroll to zoom." : "Enable image editing to pan or zoom.") : undefined}
    >
      <img
        src={imageUrl}
        alt="Cover"
        draggable={false}
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-contain"
        style={{
          transform: `translate(-50%, -50%) scale(${zoom}) translate(${translateX}%, ${translateY}%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-35" />
      {canDrag && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setIsEditing((value) => !value);
          }}
          className={`absolute bottom-4 left-4 z-10 rounded-full border px-3.5 py-2 text-[9px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md transition ${
            isEditing
              ? "border-emerald-300/35 bg-emerald-500/25 text-emerald-50"
              : "border-white/15 bg-black/55 text-white/75 hover:bg-black/70 hover:text-white"
          }`}
        >
          {isEditing ? "Done" : "Edit Image"}
        </button>
      )}
      {showHint && canDrag && isEditing && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/70 backdrop-blur-md">
          Drag image · Scroll zoom
        </div>
      )}
      {onZoomChange && isEditing && (
        <div className="absolute right-4 top-4 flex overflow-hidden rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setZoom(zoom - 0.1);
            }}
            className="flex h-8 w-9 items-center justify-center text-base font-bold transition hover:bg-white/10 disabled:opacity-40"
            aria-label="Zoom out cover image"
            disabled={zoom <= 0.35}
          >
            -
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setZoom(zoom + 0.1);
            }}
            className="flex h-8 w-9 items-center justify-center border-l border-white/10 text-base font-bold transition hover:bg-white/10 disabled:opacity-40"
            aria-label="Zoom in cover image"
            disabled={zoom >= 5}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export default function TimelineViewManager({ timeline, isAdmin, onExitPreview, onCoverImagePositionChange, onCoverImageZoomChange }: TimelineViewManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const coverImagePosition = timeline.coverImagePosition ?? { x: 50, y: 50 };
  const coverImageZoom = timeline.coverImageZoom ?? 1;
  const visibleTags = timeline.tags.slice(0, 5);
  const hiddenTagCount = Math.max(0, timeline.tags.length - visibleTags.length);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenEnabled) return;

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  };

  return (
    <div className="relative flex w-full flex-col md:h-full md:min-h-0">
      <ViewerTour />
      {isTagSheetOpen && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-sm md:items-center md:pb-0">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setIsTagSheetOpen(false)}
            aria-label="Close tags"
          />
          <section className="relative max-h-[72vh] w-full max-w-xl overflow-hidden rounded-3xl border border-foreground/10 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.28em] text-indigo-500">Timeline Tags</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{timeline.tags.length} tag{timeline.tags.length === 1 ? "" : "s"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsTagSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-foreground/60 transition hover:bg-foreground/10"
                aria-label="Close tags"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="custom-scrollbar max-h-[52vh] overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                {timeline.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-foreground/10 bg-foreground/[0.055] px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
      <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-background md:hidden">
        {onExitPreview ? (
          <button
            type="button"
            onClick={onExitPreview}
            className="fixed left-3 top-3 z-[90] flex items-center gap-1.5 rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 shadow-lg backdrop-blur-xl"
            aria-label="Exit preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit Preview
          </button>
        ) : (
          <Link
            href="/"
            className="fixed left-3 top-3 z-[90] flex items-center gap-1.5 rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 shadow-lg backdrop-blur-xl"
            aria-label="Return to homepage"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
            Home
          </Link>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          className="fixed right-3 top-3 z-[90] flex items-center gap-1.5 rounded-xl border border-foreground/10 bg-background/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/60 shadow-lg backdrop-blur-xl md:hidden"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 9H4V4m11 5h5V4M9 15H4v5m11-5h5v5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 9V4h5m6 0h5v5M4 15v5h5m11-5v5h-5" />
            </svg>
          )}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>

        {mobileViewMode === 'overview' && (
          <section className="flex h-full min-h-0 flex-col overflow-hidden px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-20">
            <div className="mb-4 flex shrink-0 flex-wrap gap-2">
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                {timeline.category}
              </span>
              {visibleTags.map((tag) => (
                <span key={tag} className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/40">
                  #{tag}
                </span>
              ))}
              {hiddenTagCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsTagSheetOpen(true)}
                  className="rounded-full border border-foreground/10 bg-foreground/[0.07] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/45"
                >
                  +{hiddenTagCount} more
                </button>
              )}
            </div>

            {timeline.coverImage && (
              <DraggableCoverImage
                imageUrl={timeline.coverImage}
                position={coverImagePosition}
                onPositionChange={onCoverImagePositionChange}
                zoom={coverImageZoom}
                onZoomChange={onCoverImageZoomChange}
                className="relative mb-4 h-48 w-full shrink-0 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/5"
                showHint
              />
            )}

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto py-3 pr-1">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Timeline Overview</p>
              <h1 className="text-5xl font-black leading-[0.88] tracking-tighter text-foreground">
                {timeline.title}
              </h1>
              <div className="my-6 h-px w-20 bg-indigo-500/70" />
              <p className="text-base font-medium leading-7 text-foreground/60">{timeline.description}</p>
            </div>

            <button
              type="button"
              onClick={() => setMobileViewMode('story')}
              className="mt-4 w-full shrink-0 rounded-2xl bg-indigo-600 px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20"
            >
              Begin Timeline
            </button>
          </section>
        )}

        {mobileViewMode === 'story' && (
          <MobileStoryMode
            events={timeline.events}
            onRequestHybrid={() => setMobileViewMode('hybrid')}
          />
        )}
        {mobileViewMode === 'hybrid' && (
          <div className="custom-scrollbar h-full overflow-y-auto pt-14">
            <VerticalTimelineWithMap
              events={timeline.events}
              onRequestExplorer={() => setMobileViewMode('map')}
            />
          </div>
        )}
        {mobileViewMode === 'map' && (
          <div className="custom-scrollbar h-full overflow-y-auto pt-14">
            <FullMapView events={timeline.events} />
          </div>
        )}
      </div>

      {/* The Engine */}
      <div className="hidden min-h-0 w-full flex-1 overflow-hidden transition-opacity duration-500 md:flex">
        <nav
          id="tour-view-modes"
          className="timeline-mode-rail group/mode-rail relative z-[95] flex w-12 shrink-0 items-center justify-center backdrop-blur-xl"
          aria-label="Timeline view modes"
        >
          <div className="flex flex-col items-center gap-1 rounded-2xl p-0.5">
            <div className="flex flex-col items-center gap-1">
              {VIEW_MODES.map((mode) => {
                const isActive = viewMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    id={mode.id === 'story' ? 'tour-story-mode' : mode.id === 'hybrid' ? 'tour-hybrid-mode' : mode.id === 'map' ? 'tour-map-mode' : undefined}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    className={`group/mode-button relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-none active:scale-[0.97] ${
                      isActive
                        ? 'border-indigo-500/50 bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 dark:border-indigo-300/30 dark:bg-indigo-500/25 dark:text-foreground'
                        : 'border-transparent bg-transparent text-foreground/55 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-foreground dark:text-foreground/60 dark:hover:bg-indigo-500/15'
                    }`}
                    aria-pressed={isActive}
                    title={`Switch to ${mode.label}`}
                  >
                    <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d={mode.icon} />
                    </svg>
                    <span className="timeline-mode-tooltip pointer-events-none absolute left-full ml-3 min-w-36 origin-left scale-95 rounded-xl px-3 py-2 text-left opacity-0 transition-all duration-200 group-hover/mode-button:scale-100 group-hover/mode-button:opacity-100 group-focus-visible/mode-button:scale-100 group-focus-visible/mode-button:opacity-100">
                      <span className="timeline-mode-tooltip-title block whitespace-nowrap text-[10px] font-black uppercase tracking-widest">
                        {mode.label}
                      </span>
                      <span className="timeline-mode-tooltip-hint mt-0.5 block whitespace-nowrap text-[8px] font-mono uppercase tracking-wider">
                        {mode.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <AdminControls
              timelineId={timeline.id}
              initialIsFeatured={timeline.isFeatured}
              creatorId={timeline.userId}
              isAdmin={isAdmin}
              mobileViewMode={mobileViewMode}
              onMobileViewModeChange={setMobileViewMode}
              onExitPreview={onExitPreview}
              variant="desktopRail"
            />
          </div>
        </nav>

        <div className="relative min-h-0 flex-1 overflow-hidden">
        {viewMode === 'overview' && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-background">
            <div className="mx-auto flex h-full w-full max-w-7xl items-center px-10 py-6">
              <div className="grid h-full max-h-[720px] min-h-0 w-full grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] items-center gap-10">
                <div className="flex h-full min-h-0 flex-col overflow-hidden py-2 text-left">
                  <div className="mb-4 flex shrink-0 flex-wrap gap-2 justify-center md:justify-start">
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                      {timeline.category}
                    </span>
                    {visibleTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/55">
                        #{tag}
                      </span>
                    ))}
                    {hiddenTagCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsTagSheetOpen(true)}
                        className="rounded-full border border-foreground/10 bg-foreground/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/55"
                      >
                        +{hiddenTagCount} more
                      </button>
                    )}
                  </div>

                  <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-5">
                    <h1 className="mb-6 max-w-3xl text-5xl font-black leading-[0.9] tracking-tighter text-foreground xl:text-7xl">
                      {timeline.title}
                    </h1>
                    <div className="mb-8 h-px w-24 bg-indigo-500/70" />
                    <p className="max-w-3xl whitespace-pre-line text-lg font-medium leading-8 text-foreground/68">
                      {timeline.description}
                    </p>
                  </div>

                  <div className="mt-5 flex shrink-0 items-center gap-4 pb-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('story')}
                      className="rounded-full bg-indigo-600 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 transition-transform hover:scale-105"
                    >
                      Enter Timeline
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-foreground/40">
                      {timeline.events.length} event{timeline.events.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="h-full min-h-0 w-full">
                  {timeline.coverImage ? (
                    <DraggableCoverImage
                      imageUrl={timeline.coverImage}
                      position={coverImagePosition}
                      onPositionChange={onCoverImagePositionChange}
                      zoom={coverImageZoom}
                      onZoomChange={onCoverImageZoomChange}
                      className="group relative h-full overflow-hidden rounded-[28px] border border-foreground/10 bg-card shadow-2xl"
                      showHint
                    />
                  ) : (
                    <div
                      className="cover-placeholder relative h-full overflow-hidden rounded-[28px] border shadow-2xl"
                      aria-label="Generated cover placeholder"
                    >
                      <div className="cover-placeholder-glow absolute inset-0" />
                      <div className="cover-placeholder-grid absolute inset-0" />
                      <div className="cover-placeholder-arc-a absolute -left-24 -top-24 h-64 w-64 rounded-full border-[34px]" />
                      <div className="cover-placeholder-arc-b absolute -bottom-28 -right-20 h-72 w-72 rounded-full border-[38px]" />
                      <div className="cover-placeholder-small-a absolute left-8 top-8 h-16 w-16 rounded-full border shadow-sm" />
                      <div className="cover-placeholder-small-b absolute bottom-10 right-10 h-20 w-20 rounded-full border shadow-sm" />

                      <div className="cover-placeholder-line absolute left-10 right-10 top-1/2 h-[3px] -translate-y-1/2 rounded-full" />
                      <div className="cover-placeholder-dot-a absolute left-[18%] top-[calc(50%-10px)] h-5 w-5 rounded-full border-[5px]" />
                      <div className="cover-placeholder-dot-b absolute left-[46%] top-[calc(50%-10px)] h-5 w-5 rounded-full border-[5px]" />
                      <div className="cover-placeholder-dot-c absolute left-[74%] top-[calc(50%-10px)] h-5 w-5 rounded-full border-[5px]" />

                      <div className="cover-placeholder-center absolute left-1/2 top-1/2 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-2xl backdrop-blur-md">
                        <div className="relative h-24 w-24">
                          <div className="cover-placeholder-ring-a absolute inset-0 rounded-full border-[10px]" />
                          <div className="cover-placeholder-ring-b absolute inset-3 rounded-full border-[10px]" />
                          <div className="cover-placeholder-core absolute inset-[34px] rounded-full" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {viewMode === 'story' && (
          <HorizontalTimeline events={timeline.events} timelineTitle={timeline.title} />
        )}
        {viewMode === 'hybrid' && (
          <VerticalTimelineWithMap
            events={timeline.events}
            onRequestExplorer={() => setViewMode('map')}
          />
        )}
        {viewMode === 'map' && (
          <FullMapView events={timeline.events} />
        )}
        </div>
      </div>

      <AdminControls
        timelineId={timeline.id}
        initialIsFeatured={timeline.isFeatured}
        creatorId={timeline.userId}
        isAdmin={isAdmin}
        mobileViewMode={mobileViewMode}
        onMobileViewModeChange={setMobileViewMode}
        onExitPreview={onExitPreview}
        variant="mobileOnly"
      />
    </div>
  );
}
