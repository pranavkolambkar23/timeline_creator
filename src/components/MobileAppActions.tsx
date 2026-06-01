"use client";

import Link from "next/link";

export default function MobileAppActions({
    isAdmin,
    onGuide,
    onFeedback,
    onFullscreen,
    isFullscreen,
    onNavigate,
}: {
    isAdmin: boolean;
    onGuide: () => void;
    onFeedback: () => void;
    onFullscreen: () => void;
    isFullscreen: boolean;
    onNavigate?: () => void;
}) {
    const actionClass = "flex w-full items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-foreground/60";
    const iconClass = "h-4 w-4 shrink-0 text-indigo-400";

    return (
        <div className="flex flex-col gap-2">
            <button type="button" onClick={onFullscreen} className={actionClass}>
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isFullscreen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 9H4V4m11 5h5V4M9 15H4v5m11-5h5v5" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 9V4h5m6 0h5v5M4 15v5h5m11-5v5h-5" />
                    )}
                </svg>
                {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            </button>

            <Link href="/global" onClick={onNavigate} className={actionClass}>
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Global Timeline
            </Link>

            <button type="button" onClick={onGuide} className={actionClass}>
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Guide & Docs
            </button>

            <button type="button" onClick={onFeedback} className={actionClass}>
                <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Give Feedback
            </button>

            {isAdmin && (
                <Link href="/admin" onClick={onNavigate} className={actionClass}>
                    <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Admin
                </Link>
            )}
        </div>
    );
}
