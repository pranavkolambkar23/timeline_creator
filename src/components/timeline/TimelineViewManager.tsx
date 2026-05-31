"use client";

import { useEffect, useState } from "react";
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
    tags: string[];
    events: any[];
    isFeatured: boolean;
    userId: string;
  };
  isAdmin: boolean;
}

type ViewMode = 'story' | 'hybrid' | 'map';
type MobileViewMode = 'overview' | ViewMode;

export default function TimelineViewManager({ timeline, isAdmin }: TimelineViewManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('story');
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <div className="w-full flex flex-col">
      <ViewerTour />
      <div className="fixed inset-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-background md:hidden">
        <Link
          href="/"
          className="fixed left-3 top-3 z-[90] rounded-xl border border-foreground/10 bg-background/80 p-2.5 text-foreground/60 shadow-lg backdrop-blur-xl"
          aria-label="Return to homepage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l9-9 9 9M5 10v10h14V10" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="fixed left-14 top-3 z-[90] rounded-xl border border-foreground/10 bg-background/80 p-2.5 text-foreground/60 shadow-lg backdrop-blur-xl"
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
        </button>

        {mobileViewMode === 'overview' && (
          <section className="flex h-full flex-col overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-20">
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
              Begin Story
            </button>
          </section>
        )}

        {mobileViewMode === 'story' && <MobileStoryMode events={timeline.events} />}
        {mobileViewMode === 'hybrid' && (
          <div className="h-full overflow-y-auto pt-14">
            <VerticalTimelineWithMap events={timeline.events} />
          </div>
        )}
        {mobileViewMode === 'map' && (
          <div className="h-full overflow-y-auto pt-14">
            <FullMapView events={timeline.events} />
          </div>
        )}
      </div>

      {/* View Toggle Controls */}
      <div id="tour-view-modes" className="hidden w-full border-t border-foreground/5 bg-background md:flex justify-center py-6 relative z-20 shadow-sm">
        <div className="bg-foreground/5 p-1.5 rounded-full flex gap-2 border border-foreground/10">
          <button
            id="tour-story-mode"
            onClick={() => setViewMode('story')}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              viewMode === 'story' 
                ? 'bg-foreground text-background shadow-lg scale-105' 
                : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Story Mode
          </button>
          
          <button
            id="tour-hybrid-mode"
            onClick={() => setViewMode('hybrid')}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              viewMode === 'hybrid' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                : 'text-foreground/50 hover:text-indigo-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
            Hybrid Mode
          </button>

          <button
            id="tour-map-mode"
            onClick={() => setViewMode('map')}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              viewMode === 'map' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105' 
                : 'text-foreground/50 hover:text-purple-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Explorer Map
          </button>
        </div>
      </div>

      {/* The Engine */}
      <div className="hidden w-full transition-opacity duration-500 md:block">
        {viewMode === 'story' && (
          <HorizontalTimeline events={timeline.events} timelineTitle={timeline.title} />
        )}
        {viewMode === 'hybrid' && (
          <VerticalTimelineWithMap events={timeline.events} />
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
      />
    </div>
  );
}
