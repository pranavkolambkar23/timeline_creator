"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import TimelineCard from "@/components/TimelineCard";

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();

    const [userTimelines, setUserTimelines] = useState<any[]>([]);
    const [featuredTimelines, setFeaturedTimelines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        router.push(session ? "/create" : "/signup");
    };

    return (
        <main className="min-h-screen bg-background transition-colors duration-500">
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
                                Start Building
                            </button>
                            <a
                                href="#explore"
                                className="px-10 py-5 bg-foreground/5 text-foreground border border-foreground/10 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all active:scale-95"
                            >
                                Explore Gallery
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
                    <div className="mb-32">
                        <div className="flex items-center gap-4 mb-12">
                            <h2 className="text-3xl font-black text-foreground tracking-tight uppercase">Your Timelines</h2>
                            <span className="px-3 py-1 bg-foreground/5 text-foreground/50 text-[10px] font-black rounded-full border border-foreground/10">
                                {userTimelines.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {userTimelines.map((timeline: any) => (
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
                    </div>
                )}

                {/* Featured Section */}
                <div>
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">Featured Timelines</h2>
                            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                        </div>
                    </div>

                    {featuredTimelines.length === 0 && !isLoading ? (
                        <div className="p-20 text-center border-2 border-dashed border-foreground/5 rounded-[3rem]">
                            <p className="text-foreground/30 font-bold italic">The gallery is currently being curated.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {featuredTimelines.map((timeline: any) => (
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
        </main>
    );
}