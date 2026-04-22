import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 🆕 POST → Create timeline with events
export async function POST(req: Request) {
    try {
        // 🔐 1. Auth check
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 📝 2. Parse body
        const body = await req.json();
        const { title, description, events } = body;

        // ⚠️ 3. Validate timeline
        if (!title || !description) {
            return NextResponse.json(
                { error: "Title and description are required" },
                { status: 400 }
            );
        }

        // ⚠️ 4. Validate events
        if (!Array.isArray(events) || events.length < 1) {
            return NextResponse.json(
                { error: "At least one event is required" },
                { status: 400 }
            );
        }

        // ⚠️ 5. Validate each event
        for (const event of events) {
            if (!event.title || !event.description || !event.date) {
                return NextResponse.json(
                    { error: "Each event must have title, description, and date" },
                    { status: 400 }
                );
            }
        }

        // 🔥 6. Create timeline + nested events
        const timeline = await prisma.timeline.create({
            data: {
                title,
                description,
                userId: session.user.id,

                timelineEvents: {
                    create: events.map((event: any) => ({
                        title: event.title,
                        description: event.description,
                        date: new Date(event.date),
                        displayDate: event.displayDate || null,
                    })),
                },
            },
            include: {
                timelineEvents: {
                    orderBy: {
                        date: "asc", // 🔥 always sorted
                    },
                },
            },
        });

        // ✅ 7. Return response
        return NextResponse.json(timeline, { status: 201 });

    } catch (error) {
        console.error("CREATE TIMELINE ERROR:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}


// 📥 GET → Fetch logged-in user's timelines (CARD VIEW)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const timelines = await prisma.timeline.findMany({
            where: {
                userId: session.user.id,
            },
            select: {
                id: true,
                title: true,
                description: true,
                isFeatured: true,
                createdAt: true,
                _count: {
                    select: {
                        timelineEvents: true, // 🔥 event count
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(timelines);

    } catch (error) {
        console.error("GET TIMELINES ERROR:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}