import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_RESULTS = 8;

const normalize = (value: string) => value.trim().toLowerCase();
const BCE_PATTERN = /\b(bce|bc)\b/i;
const CE_PATTERN = /\b(ce|ad)\b/i;

const scoreText = (value: string, query: string, weights: { exact: number; prefix: number; includes: number }) => {
    const normalizedValue = normalize(value);

    if (normalizedValue === query) return weights.exact;
    if (normalizedValue.startsWith(query)) return weights.prefix;
    if (normalizedValue.includes(query)) return weights.includes;
    return 0;
};

const ordinalSuffix = (value: number) => {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return "th";
    if (value % 10 === 1) return "st";
    if (value % 10 === 2) return "nd";
    if (value % 10 === 3) return "rd";
    return "th";
};

const formatHistoricalYear = (year: number) => year < 0 ? `${Math.abs(year)} BCE` : `${year}`;

const parseDateQuery = (query: string) => {
    const cleaned = query
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const century = /^(?:c\.?|circa\s+)?(\d+)(?:st|nd|rd|th)?\s+cent(?:ury|uries)\s*(bce|bc|ce|ad)?$/i.exec(cleaned);
    if (century) {
        const number = Number(century[1]);
        if (!number) return null;
        const isBce = BCE_PATTERN.test(century[2] ?? "");
        const startYear = isBce ? -(number * 100) : ((number - 1) * 100) + 1;
        const endYear = isBce ? -(((number - 1) * 100) + 1) : number * 100;

        return {
            type: "century" as const,
            startYear,
            endYear,
            label: `${number}${ordinalSuffix(number)} century${isBce ? " BCE" : ""}`,
        };
    }

    const year = /^(?:c\.?|circa\s+)?(-?\d+)\s*(bce|bc|ce|ad)?$/i.exec(cleaned);
    if (year) {
        const rawYear = Number(year[1]);
        if (!rawYear) return null;
        const era = year[2] ?? "";
        const historicalYear = BCE_PATTERN.test(era) ? -Math.abs(rawYear) : Math.abs(rawYear);

        return {
            type: "year" as const,
            startYear: historicalYear,
            endYear: historicalYear,
            label: formatHistoricalYear(historicalYear),
        };
    }

    return null;
};

const scoreDateMatch = (
    event: { historicalYear: number | null; displayDate: string | null; title: string },
    dateQuery: ReturnType<typeof parseDateQuery>,
) => {
    if (!dateQuery || typeof event.historicalYear !== "number") return null;

    if (event.historicalYear >= dateQuery.startYear && event.historicalYear <= dateQuery.endYear) {
        return {
            title: event.title,
            label: event.displayDate ?? dateQuery.label,
            score: dateQuery.type === "year" ? 120 : 90,
        };
    }

    return null;
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = normalize(searchParams.get("q") ?? "");
        const dateQuery = parseDateQuery(query);

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
                        displayDate: true,
                        historicalYear: true,
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

                const matchedDate = timeline.timelineEvents
                    .map((event) => scoreDateMatch(event, dateQuery))
                    .filter((event): event is NonNullable<typeof event> => Boolean(event))
                    .sort((left, right) => right.score - left.score)[0];

                const score = Math.max(
                    scoreText(timeline.title, query, { exact: 180, prefix: 150, includes: 125 }),
                    scoreText(timeline.category, query, { exact: 100, prefix: 80, includes: 65 }),
                    ...timeline.tags.map((tag) => scoreText(tag, query, { exact: 115, prefix: 95, includes: 75 })),
                    scoreText(timeline.description, query, { exact: 55, prefix: 45, includes: 35 }),
                    matchedEvent?.score ?? 0,
                    matchedDate?.score ?? 0,
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
                    matchedDate: matchedDate ? { eventTitle: matchedDate.title, label: matchedDate.label } : null,
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
