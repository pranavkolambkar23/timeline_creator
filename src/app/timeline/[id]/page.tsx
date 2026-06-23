import TimelineViewManager from "@/components/timeline/TimelineViewManager";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { compareHistoricalDates, historicalDisplayDate } from "@/lib/historicalDate";

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
                        orderBy: { createdAt: "asc" },
                    },
                },
            });

            if (dbTimeline) {
                timeline = {
                    ...dbTimeline,
                    events: dbTimeline.timelineEvents.sort(compareHistoricalDates).map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        date: e.date,
                        displayDate: historicalDisplayDate(e),
                        datePrecision: e.datePrecision,
                        isApproximate: e.isApproximate,
                        locationData: e.locationData,
                        mediaData: e.mediaData,
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

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground selection:bg-indigo-500/30 transition-colors duration-500">
            <div className="hidden md:block">
                <Header />
            </div>
            
            <main className="min-h-0 w-full flex-1">
                <TimelineViewManager timeline={timeline} isAdmin={isAdmin} />
            </main>
        </div>
    );
}
