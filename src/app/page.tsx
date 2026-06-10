"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import TimelineCard from "@/components/TimelineCard";
import Footer from "@/components/Footer";

const TIMELINES_PER_PAGE = 6;

const getTimelineCategories = (timelines: any[]) => {
    const categories = timelines
        .map((timeline) => timeline.category?.trim())
        .filter((category): category is string => Boolean(category));

    return ["All", ...Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b))];
};

const filterTimelinesByCategory = (timelines: any[], category: string) => {
    if (category === "All") return timelines;

    return timelines.filter((timeline) => timeline.category?.trim() === category);
};

const getPageItems = (currentPage: number, totalPages: number) => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (currentPage >= totalPages - 3) return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
};

function CategoryFilter({
    categories,
    selectedCategory,
    onCategoryChange,
}: {
    categories: string[];
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
}) {
    if (categories.length <= 1) return null;

    return (
        <>
            <div className="hidden sm:flex flex-wrap items-center gap-2">
                {categories.map((category) => {
                    const isSelected = category === selectedCategory;

                    return (
                        <button
                            key={category}
                            type="button"
                            onClick={() => onCategoryChange(category)}
                            className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
                                isSelected
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-foreground/5 border-foreground/10 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                            }`}
                        >
                            {category}
                        </button>
                    );
                })}
            </div>

            <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:hidden">
                {categories.map((category) => {
                    const isSelected = category === selectedCategory;

                    return (
                        <button
                            key={category}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onCategoryChange(category)}
                            className={`shrink-0 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                isSelected
                                    ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                    : "border-foreground/10 bg-foreground/5 text-foreground/50"
                            }`}
                        >
                            {category}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function Pagination({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    if (totalPages <= 1) return null;

    return (
        <nav aria-label="Timeline pages" className="mt-14 flex items-center justify-center">
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-center">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                    Previous
                </button>

                <span className="px-2 text-[10px] font-black uppercase tracking-widest text-foreground/50 sm:hidden">
                    Page {currentPage} of {totalPages}
                </span>

                <div className="hidden items-center gap-2 sm:flex">
                    {getPageItems(currentPage, totalPages).map((page, index) => (
                        typeof page === "number" ? (
                            <button
                                key={page}
                                type="button"
                                aria-label={`Go to page ${page}`}
                                aria-current={page === currentPage ? "page" : undefined}
                                onClick={() => onPageChange(page)}
                                className={`h-10 min-w-10 rounded-xl border px-3 text-[10px] font-black transition-all ${
                                    page === currentPage
                                        ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                        : "border-foreground/10 bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                                }`}
                            >
                                {page}
                            </button>
                        ) : (
                            <span key={`${page}-${index}`} className="px-1 text-xs font-black text-foreground/30">
                                {page}
                            </span>
                        )
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/60 transition-all hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                    Next
                </button>
            </div>
        </nav>
    );
}

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();
    const userTimelinesRef = useRef<HTMLDivElement>(null);
    const featuredTimelinesRef = useRef<HTMLDivElement>(null);

    const [userTimelines, setUserTimelines] = useState<any[]>([]);
    const [featuredTimelines, setFeaturedTimelines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userCategory, setUserCategory] = useState("All");
    const [userPage, setUserPage] = useState(1);
    const [featuredCategory, setFeaturedCategory] = useState("All");
    const [featuredPage, setFeaturedPage] = useState(1);

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch User Timelines if logged in
                if (session) {
                    const userRes = await fetch("/api/timeline");
                    const userData = await userRes.json();
                    setUserTimelines(Array.isArray(userData) ? userData : []);
                }

                // 2. Fetch Featured Timelines from DB
                const featuredRes = await fetch("/api/timeline?featured=true");
                const featuredData = await featuredRes.json();
                setFeaturedTimelines(Array.isArray(featuredData) ? featuredData : []);
            } catch (err) {
                console.error("Error fetching timelines:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [session]);

    const handleCreateTimeline = () => {
        router.push("/create");
    };

    const userCategories = useMemo(() => getTimelineCategories(userTimelines), [userTimelines]);
    const featuredCategories = useMemo(() => getTimelineCategories(featuredTimelines), [featuredTimelines]);
    const filteredUserTimelines = useMemo(
        () => filterTimelinesByCategory(userTimelines, userCategory),
        [userTimelines, userCategory],
    );
    const filteredFeaturedTimelines = useMemo(
        () => filterTimelinesByCategory(featuredTimelines, featuredCategory),
        [featuredTimelines, featuredCategory],
    );
    const userPageCount = Math.ceil(filteredUserTimelines.length / TIMELINES_PER_PAGE);
    const featuredPageCount = Math.ceil(filteredFeaturedTimelines.length / TIMELINES_PER_PAGE);
    const visibleUserTimelines = filteredUserTimelines.slice(
        (userPage - 1) * TIMELINES_PER_PAGE,
        userPage * TIMELINES_PER_PAGE,
    );
    const visibleFeaturedTimelines = filteredFeaturedTimelines.slice(
        (featuredPage - 1) * TIMELINES_PER_PAGE,
        featuredPage * TIMELINES_PER_PAGE,
    );

    const handleUserCategoryChange = (category: string) => {
        setUserCategory(category);
        setUserPage(1);
    };

    const handleFeaturedCategoryChange = (category: string) => {
        setFeaturedCategory(category);
        setFeaturedPage(1);
    };

    const handlePageChange = (page: number, setPage: (page: number) => void, section: HTMLDivElement | null) => {
        setPage(page);
        requestAnimationFrame(() => section?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    return (
        <main className="min-h-screen overflow-x-hidden md:overflow-x-visible bg-background transition-colors duration-500">
            <Header />

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-background pt-24 pb-32 border-b border-foreground/5">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="max-w-4xl text-center md:text-left mx-auto md:mx-0">
                        <h1 className="text-6xl md:text-8xl font-black text-foreground tracking-tighter leading-[0.85] mb-8">
                            Visualize History, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                                Event by Event.
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-foreground/60 mb-12 leading-relaxed max-w-2xl font-medium">
                            Create, explore, and share professional interactive timelines. From personal milestones to global history.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            <button
                                onClick={handleCreateTimeline}
                                className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/20 active:scale-95"
                            >
                                Create Timeline
                            </button>
                            <a
                                href="#explore"
                                className="px-10 py-5 bg-foreground/5 text-foreground border border-foreground/10 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all active:scale-95"
                            >
                                Explore Timelines
                            </a>
                        </div>
                    </div>
                </div>

                {/* Background Glow */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            </section>

            <div id="explore" className="max-w-7xl mx-auto px-6 py-24">
                
                {/* User's Own Timelines Section */}
                {session && userTimelines.length > 0 && (
                    <div ref={userTimelinesRef} className="mb-32 scroll-mt-28">
                        <div className="flex flex-col gap-8 mb-12">
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-black text-foreground tracking-tight uppercase">Your Timelines</h2>
                                <span className="px-3 py-1 bg-foreground/5 text-foreground/50 text-[10px] font-black rounded-full border border-foreground/10">
                                    {filteredUserTimelines.length}
                                </span>
                            </div>

                            <CategoryFilter
                                categories={userCategories}
                                selectedCategory={userCategory}
                                onCategoryChange={handleUserCategoryChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {visibleUserTimelines.map((timeline: any) => (
                                <TimelineCard
                                    key={timeline.id}
                                    id={timeline.id}
                                    title={timeline.title}
                                    description={timeline.description}
                                    category={timeline.category}
                                    tags={timeline.tags}
                                />
                            ))}
                        </div>

                        <Pagination
                            currentPage={userPage}
                            totalPages={userPageCount}
                            onPageChange={(page) => handlePageChange(page, setUserPage, userTimelinesRef.current)}
                        />
                    </div>
                )}

                {/* Featured Section */}
                <div ref={featuredTimelinesRef} className="scroll-mt-28">
                    <div className="flex flex-col gap-8 mb-12">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">Featured Timelines</h2>
                            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                        </div>

                        <CategoryFilter
                            categories={featuredCategories}
                            selectedCategory={featuredCategory}
                            onCategoryChange={handleFeaturedCategoryChange}
                        />
                    </div>

                    {featuredTimelines.length === 0 && !isLoading ? (
                        <div className="p-20 text-center border-2 border-dashed border-foreground/5 rounded-[3rem]">
                            <p className="text-foreground/30 font-bold italic">The gallery is currently being curated.</p>
                        </div>
                    ) : filteredFeaturedTimelines.length === 0 && !isLoading ? (
                        <div className="p-20 text-center border-2 border-dashed border-foreground/5 rounded-[3rem]">
                            <p className="text-foreground/30 font-bold italic">No timelines found in this category.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {visibleFeaturedTimelines.map((timeline: any) => (
                                    <TimelineCard
                                        key={timeline.id}
                                        id={timeline.id}
                                        title={timeline.title}
                                        description={timeline.description}
                                        category={timeline.category}
                                        tags={timeline.tags}
                                    />
                                ))}

                                {/* Skeleton loading state */}
                                {isLoading && [1, 2, 3].map((i) => (
                                    <div key={i} className="h-64 bg-foreground/5 rounded-[2rem] animate-pulse" />
                                ))}
                            </div>

                            <Pagination
                                currentPage={featuredPage}
                                totalPages={featuredPageCount}
                                onPageChange={(page) => handlePageChange(page, setFeaturedPage, featuredTimelinesRef.current)}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Final CTA */}
            {!session && (
                <section className="max-w-7xl mx-auto px-6 mb-32">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-[3.5rem] p-16 text-center text-white shadow-[0_40px_100px_-20px_rgba(79,70,229,0.3)]">
                        <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Ready to map your story?</h2>
                        <button
                            onClick={() => router.push("/signup")}
                            className="px-12 py-5 bg-white text-indigo-600 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl active:scale-95"
                        >
                            Create Free Account
                        </button>
                    </div>
                </section>
            )}

            <Footer />
        </main>
    );
}
