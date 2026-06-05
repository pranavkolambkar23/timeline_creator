"use client";

import { useEffect, useRef, useState } from "react";
import FeedbackModal from "./FeedbackModal";
import MobileAppActions from "./MobileAppActions";

export default function MobileAppDrawer({ isAdmin }: { isAdmin: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        handleFullscreenChange();
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

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed right-0 top-1/2 z-[100] flex -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-indigo-500/30 bg-background/90 p-3 text-indigo-500 shadow-xl backdrop-blur-xl md:hidden"
                aria-label="Open navigation drawer"
                aria-expanded={isOpen}
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6h.01M12 12h.01M12 18h.01" />
                </svg>
            </button>

            <div className={`fixed inset-0 z-[110] md:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                    aria-label="Close navigation drawer"
                />

                <aside
                    className={`absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col border-l border-foreground/10 bg-background/95 p-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
                    onTouchStart={(event) => {
                        touchStartX.current = event.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(event) => {
                        const touchEndX = event.changedTouches[0]?.clientX;
                        if (touchStartX.current !== null && touchEndX !== undefined && touchEndX - touchStartX.current > 60) {
                            setIsOpen(false);
                        }
                        touchStartX.current = null;
                    }}
                    aria-label="Navigation drawer"
                >
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Timeline Creator</p>
                            <h2 className="mt-1 text-lg font-black text-foreground">Navigation</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl bg-foreground/5 p-2 text-foreground/60"
                            aria-label="Close navigation drawer"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <MobileAppActions
                        isAdmin={isAdmin}
                        onGuide={() => {
                            setIsOpen(false);
                            window.dispatchEvent(new CustomEvent("open-onboarding-guide"));
                        }}
                        onFeedback={() => {
                            setIsOpen(false);
                            setIsFeedbackOpen(true);
                        }}
                        onFullscreen={toggleFullscreen}
                        isFullscreen={isFullscreen}
                        onNavigate={() => setIsOpen(false)}
                    />
                </aside>
            </div>

            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </>
    );
}
