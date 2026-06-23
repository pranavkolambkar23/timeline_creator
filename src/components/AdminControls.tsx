"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import FeedbackModal from "./FeedbackModal";
import MobileAppActions from "./MobileAppActions";
import { useToast } from "@/hooks/useToast";

const MOBILE_VIEW_MODES: { id: "overview" | "story" | "hybrid" | "map"; label: string; shortLabel: string }[] = [
    { id: "overview", label: "Timeline Overview", shortLabel: "OV" },
    { id: "story", label: "Story Mode", shortLabel: "ST" },
    { id: "hybrid", label: "Hybrid Mode", shortLabel: "HY" },
    { id: "map", label: "Explorer Mode", shortLabel: "EX" },
];

export default function AdminControls({ 
    timelineId, 
    initialIsFeatured,
    creatorId,
    isAdmin,
    mobileViewMode,
    onMobileViewModeChange,
    onExitPreview,
}: { 
    timelineId: string; 
    initialIsFeatured: boolean;
    creatorId: string;
    isAdmin: boolean;
    mobileViewMode: "overview" | "story" | "hybrid" | "map";
    onMobileViewModeChange: (viewMode: "overview" | "story" | "hybrid" | "map") => void;
    onExitPreview?: () => void;
}) {
    const { data: session } = useSession();
    const isOwner = session?.user?.id === creatorId || isAdmin;
    const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const touchStartX = useRef<number | null>(null);
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const shouldUseLight = savedTheme === "light";
        setIsDarkMode(!shouldUseLight);
        document.documentElement.classList.toggle("light", shouldUseLight);
        document.documentElement.classList.toggle("dark", !shouldUseLight);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!document.fullscreenEnabled) return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await document.documentElement.requestFullscreen();
        }
    };

    const toggleTheme = () => {
        const nextIsDark = !isDarkMode;
        document.documentElement.classList.toggle("dark", nextIsDark);
        document.documentElement.classList.toggle("light", !nextIsDark);
        localStorage.setItem("theme", nextIsDark ? "dark" : "light");
        setIsDarkMode(nextIsDark);
    };

    const toggleFeatured = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/timeline/${timelineId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isFeatured: !isFeatured }),
            });

            if (res.ok) {
                setIsFeatured(!isFeatured);
                router.refresh();
            } else {
                showToast("Failed to update timeline status.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to update timeline status.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Desktop floating controls */}
            {(isOwner || isAdmin) && (
            <div className="fixed bottom-8 right-8 z-[100] hidden md:flex flex-col items-end gap-3 group">
                {/* Tooltip */}
                <div className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-2xl">
                    Archive Management
                </div>

                {isOwner && (
                    <Link
                        href={`/timeline/${timelineId}/edit`}
                        className="flex items-center gap-3 pl-6 pr-5 py-4 rounded-[2rem] border border-indigo-500/30 bg-indigo-600/10 backdrop-blur-xl text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">Modify Narrative</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                    </Link>
                )}

                {isAdmin && (
                    <button
                        onClick={toggleFeatured}
                        disabled={isLoading}
                        className={`flex items-center gap-3 pl-6 pr-5 py-4 rounded-[2rem] border backdrop-blur-xl transition-all shadow-2xl active:scale-95 ${
                            isFeatured
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                                : "bg-foreground/5 border-foreground/10 text-foreground/40 hover:bg-rose-500/10 hover:text-rose-500"
                        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isLoading ? "Syncing..." : isFeatured ? "Remove Highlight" : "Highlight Archive"}
                        </span>

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isFeatured ? "bg-rose-500 text-white" : "bg-foreground/20 text-foreground/40"
                        }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                )}
            </div>
            )}

            {/* Mobile right-side action drawer */}
            <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="fixed right-0 top-1/2 z-[100] flex md:hidden -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-indigo-500/30 bg-background/90 p-3 text-indigo-500 shadow-xl backdrop-blur-xl"
                aria-label="Open timeline actions"
                aria-expanded={isDrawerOpen}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6h.01M12 12h.01M12 18h.01" />
                </svg>
            </button>

            <div className={`fixed inset-0 z-[110] md:hidden ${isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
                <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDrawerOpen ? "opacity-100" : "opacity-0"}`}
                    aria-label="Close timeline actions"
                />

                <aside
                    className={`absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col border-l border-foreground/10 bg-background/95 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
                    onTouchStart={(event) => {
                        touchStartX.current = event.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(event) => {
                        const touchEndX = event.changedTouches[0]?.clientX;
                        if (touchStartX.current !== null && touchEndX !== undefined && touchEndX - touchStartX.current > 60) {
                            setIsDrawerOpen(false);
                        }
                        touchStartX.current = null;
                    }}
                    aria-label="Timeline actions"
                >
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Timeline</p>
                            <h2 className="mt-1 text-lg font-black text-foreground">Actions</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDrawerOpen(false)}
                            className="rounded-xl bg-foreground/5 p-2 text-foreground/60"
                            aria-label="Close timeline actions"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="mb-3">
                            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">View Mode</p>
                            <div className="grid grid-cols-1 gap-2">
                                {MOBILE_VIEW_MODES.map((mode) => (
                                    <button
                                        key={mode.id}
                                        type="button"
                                        onClick={() => {
                                            onMobileViewModeChange(mode.id);
                                            setIsDrawerOpen(false);
                                        }}
                                        className={`rounded-2xl border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${
                                            mobileViewMode === mode.id
                                                ? "border-indigo-500/30 bg-indigo-600/10 text-indigo-500"
                                                : "border-foreground/10 bg-foreground/5 text-foreground/60"
                                        }`}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isOwner && (
                            <Link
                                href={`/timeline/${timelineId}/edit`}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-3 text-indigo-500"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Modify Narrative</span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                            </Link>
                        )}

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={toggleFeatured}
                                disabled={isLoading}
                                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                                    isFeatured
                                        ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                                        : "border-foreground/10 bg-foreground/5 text-foreground/60"
                                } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isLoading ? "Syncing..." : isFeatured ? "Remove Highlight" : "Highlight Archive"}
                                </span>
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                    isFeatured ? "bg-rose-500 text-white" : "bg-foreground/20 text-foreground/40"
                                }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </button>
                        )}

                        {onExitPreview && (
                            <button
                                type="button"
                                onClick={() => {
                                    onExitPreview();
                                    setIsDrawerOpen(false);
                                }}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-3 text-indigo-500 hover:bg-indigo-600/20 transition-all active:scale-95"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Exit Preview</span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </button>
                        )}

                        <div className="my-2 h-px bg-foreground/10" />

                        <MobileAppActions
                            isAdmin={isAdmin}
                            userEmail={session?.user?.email}
                            onGuide={() => {
                                setIsDrawerOpen(false);
                                window.dispatchEvent(new CustomEvent("open-onboarding-guide"));
                            }}
                            onFeedback={() => {
                                setIsDrawerOpen(false);
                                setIsFeedbackOpen(true);
                            }}
                            onFullscreen={toggleFullscreen}
                            isFullscreen={isFullscreen}
                            onThemeToggle={toggleTheme}
                            isDarkMode={isDarkMode}
                            onNavigate={() => setIsDrawerOpen(false)}
                        />
                    </div>

                    <p className="mt-auto text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                        Swipe right to close
                    </p>
                </aside>
            </div>
            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </>
    );
}
