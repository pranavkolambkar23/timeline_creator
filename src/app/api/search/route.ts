import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_RESULTS = 8;

const normalize = (value: string) => value.trim().toLowerCase();

const scoreText = (value: string, query: string, weights: { exact: number; prefix: number; includes: number }) => {
    const normalizedValue = normalize(value);

    if (normalizedValue === query) return weights.exact;
    if (normalizedValue.startsWith(query)) return weights.prefix;
    if (normalizedValue.includes(query)) return weights.includes;
    return 0;
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = normalize(searchParams.get("q") ?? "");

        if (query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const session = await getServerSession(authOptions);
        const visibility = session?.user?.id
            ? { OR: [{ isFeatured: true }, { userId: session.user.id }] }
            : { isFeatured: true };

        const timelines = await prisma.timeline.findMany({
            where: visibility,
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                tags: true,
                isFeatured: true,
                userId: true,
                timelineEvents: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        const results = timelines
            .map((timeline) => {
                const matchedEvent = timeline.timelineEvents
                    .map((event) => ({
                        ...event,
                        score: scoreText(event.title, query, { exact: 110, prefix: 85, includes: 65 }),
                    }))
                    .filter((event) => event.score > 0)
                    .sort((left, right) => right.score - left.score)[0];

                const score = Math.max(
                    scoreText(timeline.title, query, { exact: 180, prefix: 150, includes: 125 }),
                    scoreText(timeline.category, query, { exact: 100, prefix: 80, includes: 65 }),
                    ...timeline.tags.map((tag) => scoreText(tag, query, { exact: 115, prefix: 95, includes: 75 })),
                    scoreText(timeline.description, query, { exact: 55, prefix: 45, includes: 35 }),
                    matchedEvent?.score ?? 0,
                );

                return {
                    id: timeline.id,
                    title: timeline.title,
                    description: timeline.description,
                    category: timeline.category,
                    tags: timeline.tags,
                    isFeatured: timeline.isFeatured,
                    isOwned: timeline.userId === session?.user?.id,
                    matchedEvent: matchedEvent ? { id: matchedEvent.id, title: matchedEvent.title } : null,
                    score,
                };
            })
            .filter((timeline) => timeline.score > 0)
            .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
            .slice(0, MAX_RESULTS);

        return NextResponse.json({ results });
    } catch (error) {
        console.error("SEARCH TIMELINES ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
