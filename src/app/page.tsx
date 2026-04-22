"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import TimelineCard from "@/components/TimelineCard";
import { timelines as featuredTimelines } from "@/data/timelines";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const [userTimelines, setUserTimelines] = useState([]);

  const handleCreateTimeline = () => {
    if (!session) {
      signIn(undefined, { callbackUrl: "/create" });
      return;
    }

    router.push("/create");
  };

  // ✅ Fetch user timelines
  useEffect(() => {
    if (!session) return;

    const fetchTimelines = async () => {
      try {
        const res = await fetch("/api/timeline"); // your GET API
        const data = await res.json();

        setUserTimelines(data);
      } catch (err) {
        console.error("Error fetching timelines:", err);
      }
    };

    fetchTimelines();
  }, [session]);

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <Header />

      <div className="p-10">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Explore Timelines
          </h1>

          <button
            onClick={handleCreateTimeline}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            + Create Timeline
          </button>
        </div>

        {/* ✅ Featured Timelines */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">
            Featured
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredTimelines.map((timeline) => (
              <TimelineCard
                key={timeline.id}
                id={timeline.id}
                title={timeline.title}
                description={timeline.description}
                category={timeline.category}
              />
            ))}
          </div>
        </div>

        {/* ✅ User Timelines */}
        {session && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Your Timelines
            </h2>

            {userTimelines.length === 0 ? (
              <p className="text-gray-500">
                You haven't created any timelines yet.
              </p>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {userTimelines.map((timeline: any) => (
                  <TimelineCard
                    key={timeline.id}
                    id={timeline.id}
                    title={timeline.title}
                    description={timeline.description}
                    category="Your Timeline"
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}