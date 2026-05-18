"use client";

import { useState, useEffect } from "react";

const SLIDES = [
    {
        id: "welcome",
        title: "Welcome to Timeline Creator",
        description: "A spatial-temporal storytelling platform.",
        content: (
            <div className="space-y-4 text-white/70 text-sm">
                <p>
                    Explore history, personal journeys, and global events by blending 
                    narrative text with interactive maps.
                </p>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-4">
                    <h4 className="text-white font-bold mb-2">The Dashboard</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong className="text-indigo-400">Featured Timelines:</strong> Curated high-quality stories visible to everyone.</li>
                        <li><strong className="text-indigo-400">Your Archive:</strong> Your personal workspace where you can draft and edit your own timelines.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "studio-basics",
        title: "The Studio Layout",
        description: "Your dual-pane creative environment.",
        content: (
            <div className="space-y-4 text-white/70 text-sm">
                <p>When you click <strong>Create Timeline</strong> or edit an existing one, you enter the Studio.</p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Left: Spatial Canvas</h4>
                        </div>
                        <p className="text-xs">The interactive map where you draw locations and manage layers.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <h4 className="text-white font-bold text-xs uppercase tracking-widest">Right: Narrative Data</h4>
                        </div>
                        <p className="text-xs">Where you define timeline metadata and add chronological events.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "drawing",
        title: "Drawing Geographic Features",
        description: "How to map your story.",
        content: (
            <div className="space-y-4 text-white/70 text-sm">
                <p>On the Spatial Canvas, you can create three types of features:</p>
                <div className="space-y-2 mt-4">
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-sky-400 mt-0.5">●</span>
                        <div>
                            <strong className="text-white block">Points (Locations)</strong>
                            <span className="text-xs">Click once to place a marker.</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-emerald-400 mt-0.5">—</span>
                        <div>
                            <strong className="text-white block">LineStrings (Routes)</strong>
                            <span className="text-xs">Click to start, click to add corners, and <strong>Double-Click</strong> to finish the route.</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-violet-400 mt-0.5">◆</span>
                        <div>
                            <strong className="text-white block">Polygons (Zones/Areas)</strong>
                            <span className="text-xs">Click to map an area, and <strong>Double-Click</strong> to close the shape.</span>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-rose-400/80 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    <strong>Tip:</strong> Click a feature on the map to select it, then press Delete/Backspace or click the Trash icon to remove it.
                </p>
            </div>
        )
    },
    {
        id: "automation",
        title: "Importing & AI Automation",
        description: "Speed up your workflow.",
        content: (
            <div className="space-y-4 text-white/70 text-sm">
                <p>Don't want to type events one by one? Use our import tools located at the top right of the narrative panel:</p>
                <div className="space-y-3 mt-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Manual Import (Excel/CSV)
                        </h4>
                        <p className="text-xs">Upload a spreadsheet with Title, Description, Date, and Location columns to bulk-create events.</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
                        <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Timeline Assistant
                        </h4>
                        <p className="text-xs">Paste an itinerary, email, or unformatted text. Our AI will automatically extract dates, parse locations, generate points on the map, and structure your entire timeline in seconds.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: "feedback",
        title: "Shaping the Future",
        description: "Your voice matters.",
        content: (
            <div className="space-y-4 text-white/70 text-sm">
                <p>
                    This platform is actively evolving. As you build your stories, you might think of a missing feature, a smoother workflow, or spot a bug.
                </p>
                <div className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col items-center text-center mt-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <h4 className="text-white font-bold">Feedback is Welcomed</h4>
                    <p className="text-xs mt-2 max-w-xs mx-auto text-white/50">
                        Look for the subtle <span className="px-1.5 py-0.5 bg-white/10 rounded uppercase tracking-wider text-[9px] font-bold">Give Feedback</span> button in the navigation. We'd love to hear how you use the tool and what would make it better. No pressure, just whenever you have an idea!
                    </p>
                </div>
            </div>
        )
    }
];

export default function OnboardingGuide() {
    const [isOpen, setIsOpen] = useState(false);
    const [slideIdx, setSlideIdx] = useState(0);

    useEffect(() => {
        const hasSeen = localStorage.getItem("hasSeenGuide");
        if (!hasSeen) {
            setIsOpen(true);
        }

        const handleOpen = () => {
            setSlideIdx(0);
            setIsOpen(true);
        };
        window.addEventListener("open-onboarding-guide", handleOpen);
        return () => window.removeEventListener("open-onboarding-guide", handleOpen);
    }, []);

    const handleClose = () => {
        localStorage.setItem("hasSeenGuide", "true");
        setIsOpen(false);
    };

    if (!isOpen) return null;

    const slide = SLIDES[slideIdx];
    const isLast = slideIdx === SLIDES.length - 1;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={handleClose} />
            
            <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
                {/* Header Graphic */}
                <div className="h-32 bg-gradient-to-br from-indigo-900/40 via-[#0a0a0a] to-purple-900/20 flex items-center justify-center border-b border-white/5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 pb-4 flex-grow min-h-[300px]">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Step {slideIdx + 1} of {SLIDES.length}</span>
                        <div className="flex gap-1">
                            {SLIDES.map((_, i) => (
                                <div key={i} className={`w-8 h-1 rounded-full transition-all ${i === slideIdx ? 'bg-indigo-500' : 'bg-white/10'}`} />
                            ))}
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{slide.title}</h2>
                    <p className="text-white/40 font-medium mb-6">{slide.description}</p>
                    
                    {slide.content}
                </div>

                {/* Footer Controls */}
                <div className="p-6 pt-4 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
                    <button 
                        onClick={() => setSlideIdx(Math.max(0, slideIdx - 1))}
                        className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${slideIdx === 0 ? 'opacity-0 pointer-events-none' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                    >
                        Back
                    </button>
                    
                    {isLast ? (
                        <button 
                            onClick={handleClose}
                            className="px-8 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            Enter Platform
                        </button>
                    ) : (
                        <button 
                            onClick={() => setSlideIdx(slideIdx + 1)}
                            className="px-8 py-2.5 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-white/90 transition-all active:scale-95 flex items-center gap-2"
                        >
                            Continue
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
                
                {/* Skip */}
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                >
                    <span className="sr-only">Skip</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
