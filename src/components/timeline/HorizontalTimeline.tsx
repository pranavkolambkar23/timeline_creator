"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import HistoricalDateBadges from "./HistoricalDateBadges";

type Event = {
    id: string;
    title: string;
    description: string;
    date: string | Date;
    displayDate: string;
    datePrecision?: string | null;
    isApproximate?: boolean | null;
    mediaData?: any[];
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
    const [windowScrollY, setWindowScrollY] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(null);

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

        // Track closest active index to scanner
        let closestIndex = 0;
        let minDiff = Infinity;
        events.forEach((_, idx) => {
            const node = nodeRefs.current[idx];
            if (node) {
                const nodeCenterX = node.offsetLeft + (node.offsetWidth / 2);
                const diff = Math.abs(currentScannerX - nodeCenterX);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = idx;
                }
            }
        });
        setActiveIndex(closestIndex);

        setIsScrolled(scrollLeft > 50);
    };

    const scrollToEvent = (index: number) => {
        if (!scrollContainerRef.current || events.length === 0) return;
        const container = scrollContainerRef.current;
        const node = nodeRefs.current[index];
        if (!node) return;

        const nodeCenterX = node.offsetLeft + (node.offsetWidth / 2);
        const clientWidth = container.clientWidth;

        container.scrollTo({
            left: nodeCenterX - (clientWidth * 0.25),
            behavior: "smooth"
        });
    };

    useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        
        const handleWindowScroll = () => {
            setWindowScrollY(window.scrollY);
        };
        window.addEventListener('scroll', handleWindowScroll, { passive: true });
        
        // Initialize vertical scroll position
        setWindowScrollY(window.scrollY);

        return () => {
            window.removeEventListener('resize', handleScroll);
            window.removeEventListener('scroll', handleWindowScroll);
        };
    }, [events]);

    const showMiniHeader = isScrolled && windowScrollY > 100;

    return (
        <div className="relative w-full bg-background min-h-screen flex flex-col transition-colors duration-500 overflow-hidden">
            
            {/* CONTEXTUAL MINI-HEADER */}
            <div className={`fixed top-0 left-0 right-0 z-[60] bg-background/90 backdrop-blur-md border-b border-foreground/5 py-4 px-8 transition-all duration-500 transform ${showMiniHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-8">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Link href="/" className="flex items-center gap-2 group flex-shrink-0 mr-1">
                            <Logo className="w-7 h-7 transition-transform group-hover:scale-110 duration-500" />
                        </Link>
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
                        const isActive = nodeCenterX > 0 && activationPoint >= (nodeCenterX - 20);

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
                                <button 
                                    onClick={() => scrollToEvent(index)}
                                    className="relative z-20 focus:outline-none"
                                >
                                    <div className={`w-5 h-5 rounded-full border-4 transition-all duration-300 relative ${
                                        isActive 
                                            ? "bg-indigo-500 border-indigo-400 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.4)]" 
                                            : "bg-background border-foreground/10 hover:border-indigo-500/50"
                                    }`}>
                                        {isActive && <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />}
                                    </div>
                                </button>

                                {/* Event Card */}
                                <div 
                                    onClick={() => {
                                        if (isActive) setExpandedEventIndex(index);
                                        else scrollToEvent(index);
                                    }}
                                    className={`absolute left-1/2 -translate-x-1/2 w-[360px] transition-all duration-700 cursor-pointer hover:scale-[1.03] active:scale-[0.99] group/card ${
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
                                            <HistoricalDateBadges isApproximate={event.isApproximate} datePrecision={event.datePrecision} className="mt-2" />
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

                                        {isActive && (
                                            <div className="mt-5 flex items-center gap-4 border-t border-foreground/5 pt-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 group-hover/card:text-indigo-400 transition-colors">
                                                    Read Mode
                                                </span>
                                                {event.mediaData && event.mediaData.length > 0 && (
                                                    <span className="flex items-center gap-1.5 text-[9px] font-mono text-foreground/40 bg-foreground/5 px-2 py-1 rounded-md">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {event.mediaData.length}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="w-[40vw] flex-shrink-0" />
                </div>
            </div>

            {/* FLOATING NAVIGATION BUTTONS */}
            {activeIndex > 0 && (
                <button
                    onClick={() => scrollToEvent(activeIndex - 1)}
                    className="fixed left-6 top-1/2 -translate-y-1/2 z-[70] w-14 h-14 rounded-full bg-card/80 border border-foreground/10 text-foreground hidden md:flex items-center justify-center shadow-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:scale-110 active:scale-95 transition-all duration-300 group"
                    aria-label="Previous event"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
            {activeIndex < events.length - 1 && (
                <button
                    onClick={() => scrollToEvent(activeIndex + 1)}
                    className="fixed right-6 top-1/2 -translate-y-1/2 z-[70] w-14 h-14 rounded-full bg-card/80 border border-foreground/10 text-foreground hidden md:flex items-center justify-center shadow-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:scale-110 active:scale-95 transition-all duration-300 group"
                    aria-label="Next event"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Scroll Indication Footer */}
            {!isScrolled && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 animate-pulse opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">Begin Story</span>
                </div>
            )}

            {/* Read Mode Overlay */}
            {expandedEventIndex !== null && events[expandedEventIndex] && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-3xl" onClick={() => setExpandedEventIndex(null)} />
                    
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-foreground/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        {/* Close Button */}
                        <button 
                            onClick={() => setExpandedEventIndex(null)}
                            className="absolute right-6 top-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
                        >
                            <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className="space-y-4 text-center">
                                    <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 bg-indigo-500/10 px-4 py-1.5 rounded-full">
                                        {events[expandedEventIndex].displayDate}
                                    </span>
                                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
                                        {events[expandedEventIndex].title}
                                    </h2>
                                </div>
                                
                                <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto rounded-full" />
                                
                                <div className="prose prose-invert max-w-none text-foreground/70 leading-loose">
                                    <p className="text-lg whitespace-pre-wrap">{events[expandedEventIndex].description}</p>
                                </div>

                                {events[expandedEventIndex].mediaData && events[expandedEventIndex].mediaData!.length > 0 && (
                                    <div className="pt-8 space-y-8 border-t border-foreground/10 mt-8">
                                        {events[expandedEventIndex].mediaData!.map((media, i) => (
                                            <div key={i} className="rounded-2xl overflow-hidden border border-foreground/10 bg-foreground/5">
                                                {media.type === 'image' ? (
                                                    <img src={media.url} alt={media.title || "Event media"} className="w-full h-auto object-cover" />
                                                ) : media.type === 'audio' ? (
                                                    <div className="p-6">
                                                        <p className="text-xs font-mono uppercase tracking-widest text-foreground/40 mb-4">{media.title || "Audio Recording"}</p>
                                                        <audio controls className="w-full">
                                                            <source src={media.url} />
                                                        </audio>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
