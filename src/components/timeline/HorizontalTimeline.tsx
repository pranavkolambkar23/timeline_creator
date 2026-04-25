"use client";

import React, { useRef, useEffect, useState } from "react";

type Event = {
    id: string;
    title: string;
    description: string;
    date: string | Date;
    displayDate: string;
};

export default function HorizontalTimeline({ 
    events, 
    timelineTitle 
}: { 
    events: Event[], 
    timelineTitle: string 
}) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [activationPoint, setActivationPoint] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    const handleScroll = () => {
        if (!scrollContainerRef.current || events.length === 0) return;
        
        const container = scrollContainerRef.current;
        const { scrollLeft, clientWidth } = container;
        
        // The "Scanner" point - 25% into the screen
        const currentScannerX = scrollLeft + (clientWidth * 0.25);
        setActivationPoint(currentScannerX);
        
        // Calculate progress based on the center of the first and last nodes
        const firstNode = nodeRefs.current[0];
        const lastNode = nodeRefs.current[events.length - 1];
        
        if (firstNode && lastNode) {
            // Get center points
            const firstCenter = firstNode.offsetLeft + (firstNode.offsetWidth / 2);
            const lastCenter = lastNode.offsetLeft + (lastNode.offsetWidth / 2);
            
            const totalDistance = lastCenter - firstCenter;
            const currentDistance = currentScannerX - firstCenter;
            
            const scrollPercent = Math.min(Math.max((currentDistance / (totalDistance || 1)) * 100, 0), 100);
            setProgress(scrollPercent);
        }

        setIsScrolled(scrollLeft > 50);
    };

    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [events]);

    return (
        <div className="relative w-full bg-background min-h-screen flex flex-col transition-colors duration-500 overflow-hidden">
            
            {/* CONTEXTUAL MINI-HEADER */}
            <div className={`fixed top-0 left-0 right-0 z-[60] bg-background/90 backdrop-blur-md border-b border-foreground/5 py-4 px-8 transition-all duration-500 transform ${isScrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0 animate-pulse" />
                        <h2 className="text-sm font-black text-foreground truncate uppercase tracking-[0.2em]">{timelineTitle}</h2>
                    </div>
                    
                    <div className="flex-grow max-w-md hidden md:block">
                        <div className="w-full h-1 bg-foreground/5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-black text-foreground/40 uppercase tracking-widest">
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                </div>
            </div>

            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-grow flex overflow-x-auto pt-72 pb-72 px-[20vw] no-scrollbar scroll-smooth relative z-10"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <div className="flex items-center relative min-w-max">
                    
                    {/* THE CORE TIMELINE LINE */}
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-foreground/5 -translate-y-1/2 z-0">
                        {/* Progress Line - Precisely center-to-center */}
                        {nodeRefs.current[0] && nodeRefs.current[events.length-1] && (
                            <div 
                                className="absolute bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-200 h-full"
                                style={{ 
                                    left: `${nodeRefs.current[0]!.offsetLeft + (nodeRefs.current[0]!.offsetWidth / 2)}px`,
                                    width: `${(progress / 100) * ( (nodeRefs.current[events.length-1]!.offsetLeft + (nodeRefs.current[events.length-1]!.offsetWidth / 2)) - (nodeRefs.current[0]!.offsetLeft + (nodeRefs.current[0]!.offsetWidth / 2)) )}px`
                                }}
                            />
                        )}
                    </div>
                    
                    {events.map((event, index) => {
                        const isEven = index % 2 === 0;
                        
                        // PIXEL PERFECT ACTIVATION: Check if scanner has passed the center of this node
                        const container = nodeRefs.current[index];
                        const nodeCenterX = container ? (container.offsetLeft + (container.offsetWidth / 2)) : 0;
                        const isActive = nodeCenterX > 0 && activationPoint >= nodeCenterX;

                        return (
                            <div 
                                key={event.id} 
                                ref={el => { nodeRefs.current[index] = el; }}
                                className="relative flex-shrink-0 w-[420px] flex flex-col items-center"
                            >
                                
                                {/* Vertical Connector */}
                                <div className={`absolute left-1/2 -translate-x-1/2 w-[2px] transition-all duration-700 ${
                                    isActive ? "bg-indigo-500/30" : "bg-foreground/5"
                                } ${isEven ? "bottom-1/2 mb-3 h-20" : "top-1/2 mt-3 h-20"}`} />

                                {/* The Node (The Circle) */}
                                <div className="relative z-20">
                                    <div className={`w-5 h-5 rounded-full border-4 transition-all duration-300 relative ${
                                        isActive 
                                            ? "bg-indigo-500 border-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                                            : "bg-background border-foreground/10"
                                    }`}>
                                        {isActive && <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />}
                                    </div>
                                </div>

                                {/* Event Card */}
                                <div 
                                    className={`absolute left-1/2 -translate-x-1/2 w-[360px] transition-all duration-700 ${
                                        isEven ? "bottom-[calc(50%+4rem)]" : "top-[calc(50%+4rem)]"
                                    } ${isActive ? "opacity-100 translate-y-0" : "opacity-30 translate-y-4"}`}
                                >
                                    <div className={`bg-card/70 backdrop-blur-md border rounded-[2rem] p-7 shadow-2xl transition-all duration-500 ${
                                        isActive ? "border-indigo-500/20 shadow-indigo-500/5 bg-card/90" : "border-foreground/5 shadow-none"
                                    }`}>
                                        <div className="mb-4">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                                                isActive ? "text-indigo-500" : "text-foreground/20"
                                            }`}>
                                                {event.displayDate}
                                            </span>
                                        </div>

                                        <h3 className={`text-xl font-black mb-3 tracking-tighter transition-colors duration-500 leading-tight ${
                                            isActive ? "text-foreground" : "text-foreground/30"
                                        }`}>
                                            {event.title}
                                        </h3>
                                        <p className={`text-sm leading-relaxed font-medium transition-colors duration-500 line-clamp-4 ${
                                            isActive ? "text-foreground/60" : "text-foreground/20"
                                        }`}>
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="w-[40vw] flex-shrink-0" />
                </div>
            </div>

            {/* Scroll Indication Footer */}
            {!isScrolled && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 animate-pulse opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Begin Story</span>
                </div>
            )}
        </div>
    );
}
