import TimelineCard from "@/components/TimelineCard";
import { timelines } from "@/data/timelines";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-10">

      <h1 className="text-3xl font-bold mb-8">
        Explore Timelines
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {timelines.map((timeline) => (
          <TimelineCard
            key={timeline.id}
            id={timeline.id}
            title={timeline.title}
            description={timeline.description}
            category={timeline.category}
          />
        ))}
      </div>

    </main>
  );
}