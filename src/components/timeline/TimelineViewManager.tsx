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

const VIEW_MODES: { id: ViewMode; label: string; hint: string }[] = [
  { id: 'overview', label: 'Overview', hint: 'Timeline details' },
  { id: 'story', label: 'Story', hint: 'Horizontal read' },
  { id: 'hybrid', label: 'Hybrid', hint: 'Events and map' },
  { id: 'map', label: 'Explorer Mode', hint: 'Spatial view' },
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
  const coverImagePosition = timeline.coverImagePosition ?? { x: 50, y: 50 };
  const coverImageZoom = timeline.coverImageZoom ?? 1;

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
    <div className="flex w-full flex-col md:h-full md:min-h-0">
      <ViewerTour />
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
          <section className="custom-scrollbar flex h-full flex-col overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20">
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                {timeline.category}
              </span>
              {timeline.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-foreground/40">
                  #{tag}
                </span>
              ))}
            </div>

            {timeline.coverImage && (
              <DraggableCoverImage
                imageUrl={timeline.coverImage}
                position={coverImagePosition}
                onPositionChange={onCoverImagePositionChange}
                zoom={coverImageZoom}
                onZoomChange={onCoverImageZoomChange}
                className="relative mb-6 h-48 w-full shrink-0 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/5"
                showHint
              />
            )}

            <div className="my-auto">
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Timeline Overview</p>
              <h1 className="text-5xl font-black leading-[0.88] tracking-tighter text-foreground">
                {timeline.title}
              </h1>
              <div className="my-7 h-px w-20 bg-indigo-500/70" />
              <p className="text-base font-medium leading-7 text-foreground/60">{timeline.description}</p>
            </div>

            <button
              type="button"
              onClick={() => setMobileViewMode('story')}
              className="mt-8 w-full rounded-2xl bg-indigo-600 px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20"
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

      <div id="tour-view-modes" className="relative z-20 hidden w-full shrink-0 border-y border-foreground/10 bg-background/95 px-6 py-2.5 shadow-sm backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-[150px]">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-foreground/45">Current Mode</p>
            <p className="mt-0.5 text-sm font-black text-foreground">
              {VIEW_MODES.find((mode) => mode.id === viewMode)?.label}
            </p>
          </div>

          <div className="grid flex-1 grid-cols-4 gap-2">
            {VIEW_MODES.map((mode) => {
              const isActive = viewMode === mode.id;

              return (
                <button
                  key={mode.id}
                  id={mode.id === 'story' ? 'tour-story-mode' : mode.id === 'hybrid' ? 'tour-hybrid-mode' : mode.id === 'map' ? 'tour-map-mode' : undefined}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`group relative cursor-pointer overflow-hidden rounded-lg border px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 dark:border-indigo-400 dark:bg-indigo-500/25 dark:text-foreground'
                      : 'border-foreground/20 bg-card text-foreground/70 shadow-sm hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-foreground hover:shadow-md dark:border-foreground/15 dark:bg-foreground/[0.06] dark:text-foreground/65 dark:hover:bg-indigo-500/15'
                  }`}
                  aria-pressed={isActive}
                  title={`Switch to ${mode.label}`}
                >
                  <span className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 transition-opacity ${isActive ? 'bg-white/80 opacity-100 dark:bg-indigo-300' : 'bg-indigo-400 opacity-0 group-hover:opacity-100'}`} />
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest">{mode.label}</span>
                    <span className={`h-2 w-2 rounded-full transition-colors ${isActive ? 'bg-white dark:bg-indigo-300' : 'bg-foreground/35 group-hover:bg-indigo-400'}`} />
                  </span>
                  <span className={`mt-1 block truncate text-[9px] font-mono uppercase tracking-wider ${isActive ? 'text-white/75 dark:text-foreground/70' : 'text-foreground/45 group-hover:text-foreground/65'}`}>
                    {mode.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="w-32 text-right text-[8px] font-black uppercase leading-4 tracking-[0.22em] text-foreground/45">
            Click a card to switch
          </p>
        </div>
      </div>

      {/* The Engine */}
      <div className="relative hidden min-h-0 w-full flex-1 overflow-hidden transition-opacity duration-500 md:block">
        {viewMode === 'overview' && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-background">
            <div className="mx-auto flex h-full w-full max-w-7xl items-center px-10 py-8">
              <div className="grid h-full max-h-[720px] w-full grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] items-center gap-10">
                <div className="flex min-h-0 flex-col text-left">
                  <div className="mb-6 flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                      {timeline.category}
                    </span>
                    {timeline.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-foreground/10 bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/55">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="min-h-0">
                    <h1 className="mb-6 max-w-3xl text-5xl font-black leading-[0.9] tracking-tighter text-foreground xl:text-7xl">
                      {timeline.title}
                    </h1>
                    <div className="mb-8 h-px w-24 bg-indigo-500/70" />
                    <div className="custom-scrollbar max-h-[30vh] overflow-y-auto pr-5">
                      <p className="max-w-3xl whitespace-pre-line text-lg font-medium leading-8 text-foreground/68">
                        {timeline.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex shrink-0 items-center gap-4">
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

      <AdminControls
        timelineId={timeline.id}
        initialIsFeatured={timeline.isFeatured}
        creatorId={timeline.userId}
        isAdmin={isAdmin}
        mobileViewMode={mobileViewMode}
        onMobileViewModeChange={setMobileViewMode}
        onExitPreview={onExitPreview}
      />
    </div>
  );
}
