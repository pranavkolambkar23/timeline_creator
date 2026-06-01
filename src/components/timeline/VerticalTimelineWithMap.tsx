"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import InteractiveMap from "./InteractiveMap";
import HistoricalDateBadges from "./HistoricalDateBadges";

interface VerticalTimelineWithMapProps {
  events: any[];
}

export default function VerticalTimelineWithMap({ events }: VerticalTimelineWithMapProps) {
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [mobileTimelineHeight, setMobileTimelineHeight] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeMobilePanes = (clientY: number) => {
    const container = containerRef.current;
    if (!container) return;

    const { top, height } = container.getBoundingClientRect();
    const nextHeight = ((clientY - top) / height) * 100;
    setMobileTimelineHeight(Math.min(Math.max(nextHeight, 25), 75));
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex h-[calc(100dvh-3.5rem)] flex-col lg:h-[800px] lg:flex-row border-y border-foreground/5 bg-background"
      style={{ "--mobile-timeline-height": `${mobileTimelineHeight}%` } as CSSProperties}
    >
      {/* Left Pane: Vertical Timeline */}
      <div
        className="h-[var(--mobile-timeline-height)] w-full lg:w-[40%] xl:w-1/3 lg:h-full overflow-y-auto border-b lg:border-b-0 lg:border-r border-foreground/5 relative scrollbar-hide py-12 bg-background/50 backdrop-blur-md"
      >
        <div className="px-8 md:px-12">
          {/* Vertical Track Line */}
          <div className="absolute left-[3.25rem] md:left-[4.25rem] top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-foreground/10 to-transparent" />
          
          {events.map((event) => {
            const isActive = activeEventId === event.id;
            
            return (
              <div 
                key={event.id}
                className={`relative mb-16 pl-10 cursor-pointer group transition-all duration-500 ${isActive ? 'opacity-100 translate-x-2' : 'opacity-40 hover:opacity-100 hover:translate-x-1'}`}
                onClick={() => setActiveEventId(event.id)}
              >
                {/* Node */}
                <div className={`absolute left-[-10px] top-1.5 w-5 h-5 rounded-full border-[3px] transition-all duration-500 flex items-center justify-center z-10
                  ${isActive 
                    ? 'bg-background border-purple-500 scale-125 shadow-[0_0_20px_rgba(168,85,247,0.6)]' 
                    : 'bg-background border-foreground/20 group-hover:border-purple-400 group-hover:scale-110'
                  }`}
                >
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />}
                </div>

                {/* Content */}
                <div className="text-[10px] font-black text-purple-400/80 tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
                  {event.displayDate}
                  {isActive && <span className="w-8 h-[1px] bg-purple-500/50 block" />}
                </div>
                <HistoricalDateBadges isApproximate={event.isApproximate} datePrecision={event.datePrecision} className="mb-3" />
                
                <h3 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                  {event.title}
                </h3>
                
                <p className={`text-sm leading-relaxed transition-colors duration-300 ${isActive ? 'text-foreground/70' : 'text-foreground/40'}`}>
                  {event.description}
                </p>
                
                {/* Location Badge */}
                {event.locationData && (
                  <div className="mt-5 flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300
                      ${isActive ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-foreground/5 text-foreground/40 border border-foreground/5'}
                    `}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Spatial Data Active
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        role="separator"
        aria-label="Resize timeline and map panes"
        aria-orientation="horizontal"
        aria-valuemin={25}
        aria-valuemax={75}
        aria-valuenow={Math.round(mobileTimelineHeight)}
        className="relative z-20 flex h-5 shrink-0 touch-none cursor-row-resize items-center justify-center bg-background lg:hidden"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          resizeMobilePanes(event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            resizeMobilePanes(event.clientY);
          }
        }}
      >
        <div className="flex h-7 w-14 items-center justify-center gap-1.5 rounded-lg border border-foreground/15 bg-card/95 shadow-lg shadow-black/20">
          <span className="h-1 w-1 rounded-full bg-foreground/50" />
          <span className="h-1 w-1 rounded-full bg-foreground/50" />
          <span className="h-1 w-1 rounded-full bg-foreground/50" />
        </div>
      </div>
      
      {/* Right Pane: Interactive Map */}
      <div className="min-h-0 w-full flex-1 lg:w-[60%] xl:w-2/3 lg:h-full p-0 lg:p-6 bg-black/95 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10 w-8 lg:w-16 pointer-events-none" />
        <InteractiveMap events={events} activeEventId={activeEventId} />
      </div>
    </div>
  );
}
