import { timelineMap } from "@/data/timelines/map";
import Timeline from "@/components/timeline/Timeline";

export default async function TimelinePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const timeline = timelineMap[id];

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