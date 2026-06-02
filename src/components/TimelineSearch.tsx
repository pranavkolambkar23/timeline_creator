"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SearchResult = {
    id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    isFeatured: boolean;
    isOwned: boolean;
    matchedEvent: {
        id: string;
        title: string;
    } | null;
    matchedDate: {
        eventTitle: string;
        label: string;
    } | null;
};

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
        </svg>
    );
}

function SearchResults({
    query,
    results,
    isLoading,
    onNavigate,
    variant = "panel",
}: {
    query: string;
    results: SearchResult[];
    isLoading: boolean;
    onNavigate: () => void;
    variant?: "panel" | "mobile";
}) {
    const isMobile = variant === "mobile";

    if (query.trim().length < 2) {
        return (
            <p className={`${isMobile ? "p-5" : "px-6 py-5"} text-sm font-medium leading-relaxed text-foreground/45`}>
                Search timeline titles, events, categories, or tags.
            </p>
        );
    }

    if (isLoading) {
        return (
            <div className={`${isMobile ? "p-5" : "px-6 py-5"} flex items-center gap-3 text-xs font-black uppercase tracking-widest text-foreground/45`}>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/25 border-t-indigo-500" />
                Searching
            </div>
        );
    }

    if (results.length === 0) {
        return <p className={`${isMobile ? "p-5" : "px-6 py-5"} text-sm font-medium text-foreground/45`}>No matching timelines found.</p>;
    }

    return (
        <div className={`${isMobile ? "max-h-none flex-1" : "max-h-[min(36rem,68vh)]"} custom-scrollbar overflow-y-auto p-2`}>
            {results.map((result) => (
                <Link
                    key={result.id}
                    href={`/timeline/${result.id}`}
                    onClick={onNavigate}
                    className="block rounded-2xl p-4 transition-colors hover:bg-foreground/5"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-black leading-snug text-foreground sm:text-lg">{result.title}</h3>
                            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground/45">{result.description}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                            {result.isOwned && (
                                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-indigo-500">
                                    Yours
                                </span>
                            )}
                            {result.isFeatured && (
                                <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-purple-400">
                                    Featured
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-foreground/5 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-foreground/45">
                            {result.category}
                        </span>
                        {result.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[9px] font-bold text-foreground/35">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    {result.matchedEvent && (
                        <p className="mt-2 truncate text-[10px] font-bold text-indigo-400">
                            Matched event: {result.matchedEvent.title}
                        </p>
                    )}

                    {result.matchedDate && (
                        <p className="mt-2 truncate text-[10px] font-bold text-purple-400">
                            Matched date: {result.matchedDate.label} in {result.matchedDate.eventTitle}
                        </p>
                    )}
                </Link>
            ))}
        </div>
    );
}

export default function TimelineSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const requestIdRef = useRef(0);
    const desktopContainerRef = useRef<HTMLDivElement>(null);
    const desktopInputRef = useRef<HTMLInputElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        const timeout = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
                if (!response.ok) throw new Error("Search failed");
                const data = await response.json();
                if (requestId === requestIdRef.current) setResults(data.results ?? []);
            } catch (error) {
                console.error("Timeline search failed", error);
                if (requestId === requestIdRef.current) setResults([]);
            } finally {
                if (requestId === requestIdRef.current) setIsLoading(false);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest("[data-search-surface='true']")) return;
            if (!desktopContainerRef.current?.contains(target)) setIsDesktopOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    useEffect(() => {
        if (isDesktopOpen) desktopInputRef.current?.focus();
    }, [isDesktopOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

            if (event.key === "/" && !isTyping && !isMobileOpen) {
                event.preventDefault();
                setIsDesktopOpen(true);
            }

            if (event.key === "Escape") {
                setIsDesktopOpen(false);
                setIsMobileOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isMobileOpen]);

    useEffect(() => {
        if (!isMobileOpen) return;
        mobileInputRef.current?.focus();
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileOpen]);

    const closeMobileSearch = () => {
        setIsMobileOpen(false);
        setQuery("");
    };

    return (
        <>
            <div ref={desktopContainerRef} className="relative hidden min-w-0 flex-1 md:block">
                <button
                    type="button"
                    onClick={() => setIsDesktopOpen(true)}
                    className="flex w-full items-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-2 text-left text-foreground/45 transition-colors hover:bg-foreground/10"
                >
                    <SearchIcon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">Search timelines, events, categories, tags</span>
                    <span className="rounded-md border border-foreground/10 bg-background/50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-foreground/30">
                        /
                    </span>
                </button>

                {isMounted && isDesktopOpen && createPortal(
                    <div data-search-surface="true" className="fixed inset-0 z-[120] bg-background/45 px-6 pt-24 backdrop-blur-sm">
                        <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-foreground/10 bg-background/95 shadow-2xl">
                            <label className="flex items-center gap-3 border-b border-foreground/10 px-5 py-4 text-foreground/45">
                                <SearchIcon className="h-5 w-5 shrink-0 text-indigo-400" />
                                <input
                                    ref={desktopInputRef}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search timelines, events, categories, tags"
                                    className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-foreground/35"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsDesktopOpen(false)}
                                    className="rounded-xl bg-foreground/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 hover:bg-foreground/10"
                                >
                                    Esc
                                </button>
                            </label>
                            <SearchResults query={query} results={results} isLoading={isLoading} onNavigate={() => setIsDesktopOpen(false)} />
                        </div>
                    </div>,
                    document.body,
                )}
            </div>

            <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 px-3 py-2.5 text-left text-foreground/45 transition-all active:scale-[0.98] md:hidden"
                aria-label="Search timelines"
            >
                <SearchIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">Search timelines</span>
            </button>

            {isMounted && isMobileOpen && createPortal(
                <div data-search-surface="true" className="fixed inset-0 z-[200] flex flex-col bg-background md:hidden">
                    <div className="flex items-center gap-2 border-b border-foreground/10 bg-background/95 px-3 py-3 backdrop-blur-xl">
                        <button
                            type="button"
                            onClick={closeMobileSearch}
                            className="rounded-xl p-2 text-foreground/60"
                            aria-label="Close search"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m15 18-6-6 6-6" />
                            </svg>
                        </button>

                        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-indigo-500/40 bg-foreground/5 px-3 py-2.5 text-foreground/45">
                            <SearchIcon className="h-4 w-4 shrink-0" />
                            <input
                                ref={mobileInputRef}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search timelines and events"
                                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-foreground/35"
                            />
                        </label>
                    </div>

                    <SearchResults query={query} results={results} isLoading={isLoading} onNavigate={closeMobileSearch} variant="mobile" />
                </div>,
                document.body,
            )}
        </>
    );
}
