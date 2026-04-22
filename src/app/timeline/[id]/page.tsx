import { timelineMap } from "@/data/timelines/map";
import Timeline from "@/components/timeline/Timeline";

export default async function TimelinePage({
    params,
}: {
    params: Promise<{ id: string }>; // ✅ MUST be Promise
}) {
    const { id } = await params; // ✅ MUST await

    console.log("ID:", id);

    let timeline = timelineMap[id];

    // ✅ Fetch from DB if not static
    if (!timeline && id) {
        try {
            const res = await fetch(
                `http://localhost:3000/api/timeline/${id}`,
                { cache: "no-store" }
            );

            if (res.ok) {
                const data = await res.json();


                timeline = {
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    tags: [],
                    events: data.timelineEvents.map((e: any) => ({
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        date: e.date,
                        displayDate: new Date(e.date).toLocaleDateString(),
                    })),
                };
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    }

    if (!timeline) {
        return <div className="p-8">Timeline not found</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">
                {timeline.title}
            </h1>

            <p className="text-gray-600 mb-8">
                {timeline.description}
            </p>

            <Timeline events={timeline.events} />
        </div>
    );
}