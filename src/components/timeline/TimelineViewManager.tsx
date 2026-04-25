"use client";

import { useState } from "react";
import HorizontalTimeline from "./HorizontalTimeline";
import VerticalTimelineWithMap from "./VerticalTimelineWithMap";
import FullMapView from "./FullMapView";

interface TimelineViewManagerProps {
  timeline: {
    title: string;
    events: any[];
  };
}

type ViewMode = 'story' | 'hybrid' | 'map';

export default function TimelineViewManager({ timeline }: TimelineViewManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('story');

  return (
    <div className="w-full flex flex-col">
      {/* View Toggle Controls */}
      <div className="w-full border-t border-foreground/5 bg-background flex justify-center py-6 relative z-20 shadow-sm">
        <div className="bg-foreground/5 p-1.5 rounded-full flex gap-2 border border-foreground/10">
          <button
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
      <div className="w-full transition-opacity duration-500">
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
    </div>
  );
}
