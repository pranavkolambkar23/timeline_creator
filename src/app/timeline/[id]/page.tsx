import { timelineMap } from "@/data/timelines/map";
import Timeline from "@/components/timeline/Timeline";
import { prisma } from "@/lib/prisma";

export default async function TimelinePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // 1. Try static timelines first
    let timeline = timelineMap[id];

    // 2. If not found in static maps, check the database directly
    if (!timeline && id) {
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
                    id: dbTimeline.id,
                    title: dbTimeline.title,
                    description: dbTimeline.description,
                    tags: [],
                    events: dbTimeline.timelineEvents.map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        date: e.date,
                        displayDate: new Date(e.date).toLocaleDateString(),
                    })),
                };
            }
        } catch (err) {
            console.error("Database fetch error:", err);
        }
    }

    if (!timeline) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Timeline not found</h2>
                    <p className="text-slate-600 mb-6">The timeline you are looking for doesn't exist or has been removed.</p>
                    <a href="/" className="text-indigo-600 font-medium hover:text-indigo-500">
                        Go back home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                        {timeline.title}
                    </h1>
                    <p className="text-lg text-slate-600 max-w-3xl leading-relaxed">
                        {timeline.description}
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8 overflow-hidden">
                    <Timeline events={timeline.events} />
                </div>
            </div>
        </div>
    );
}