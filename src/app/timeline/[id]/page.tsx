import TimelineViewManager from "@/components/timeline/TimelineViewManager";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminControls from "@/components/AdminControls";
import { getCategoryColor } from "@/lib/colors";

export default async function TimelinePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";

    let timeline = null;

    if (id) {
        try {
            const dbTimeline = await prisma.timeline.findUnique({
                where: { id },
                include: {
                    timelineEvents: {
                        orderBy: { date: "asc" },
                    },
                },
            });

            if (dbTimeline) {
                timeline = {
                    ...dbTimeline,
                    events: dbTimeline.timelineEvents.map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        date: e.date,
                        displayDate: e.displayDate || new Date(e.date).toLocaleDateString("en-US", { month: 'short', year: 'numeric' }),
                        locationData: e.locationData,
                    })),
                };
            }
        } catch (err) {
            console.error("Database fetch error:", err);
        }
    }

    if (!timeline) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center p-8 bg-card rounded-[2rem] border border-foreground/5 max-w-md mx-4">
                        <h2 className="text-2xl font-black text-foreground mb-2">Record Not Found</h2>
                        <p className="text-foreground/40 mb-6 font-medium">This chapter of history remains unwritten.</p>
                        <a href="/" className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                            Return to Base
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const categoryClass = getCategoryColor(timeline.category);

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30 overflow-x-hidden transition-colors duration-500">
            <Header />
            
            <main className="w-full">
                {/* HERO SECTION - Entry Point */}
                <div className="max-w-[1400px] mx-auto px-6 pt-32 pb-24">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-8 flex flex-wrap justify-center gap-3">
                            <span className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest border rounded-full backdrop-blur-md bg-foreground/5 ${categoryClass.replace('bg-', 'text-').replace('text-', 'border-')}`}>
                                {timeline.category}
                            </span>
                            {timeline.tags.map((tag: string) => (
                                <span key={tag} className="px-4 py-2 text-[10px] font-black text-foreground/40 bg-foreground/5 border border-foreground/5 rounded-full uppercase tracking-widest">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        
                        <h1 className="text-6xl md:text-[7rem] font-black text-foreground mb-10 tracking-tighter leading-[0.85] max-w-5xl">
                            {timeline.title}
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-foreground/50 leading-relaxed font-medium max-w-3xl mb-16">
                            {timeline.description}
                        </p>

                        <div className="flex items-center gap-4 text-foreground/20">
                            <div className="w-12 h-[1px] bg-foreground/10" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Scroll Down to Enter</span>
                            <div className="w-12 h-[1px] bg-foreground/10" />
                        </div>
                    </div>
                </div>

                {/* THE FOCUS ENGINE */}
                <TimelineViewManager timeline={timeline} />

                {/* FINAL FOOTER */}
                <div className="max-w-7xl mx-auto px-6 py-40 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mb-12 shadow-2xl shadow-indigo-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-black text-foreground mb-4 tracking-tight">End of the Journey</h3>
                    <p className="text-foreground/40 font-medium max-w-md text-center mb-12">
                        You have reached the end of this timeline. Knowledge is power. Share this story with the world.
                    </p>
                    <a href="/" className="px-10 py-4 bg-foreground/5 border border-foreground/10 text-foreground rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-foreground/10 transition-all active:scale-95">
                        Explore More Timelines
                    </a>
                </div>

                {/* Floating Admin Controls */}
                {isAdmin && (
                    <AdminControls 
                        timelineId={timeline.id} 
                        initialIsFeatured={timeline.isFeatured} 
                        creatorId={timeline.userId}
                    />
                )}
            </main>
        </div>
    );
}