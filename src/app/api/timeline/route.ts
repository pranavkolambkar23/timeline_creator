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
        const { title, description, events, category, tags } = body;

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
                category: category || "General",
                tags: tags || [],
                userId: session.user.id,

                timelineEvents: {
                    create: events.map((event: any) => ({
                        title: event.title,
                        description: event.description,
                        date: new Date(event.date),
                        displayDate: event.displayDate || null,
                        locationData: event.locationData || null,
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


// 📥 GET → Fetch timelines (with Admin support)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const featured = searchParams.get("featured") === "true";
        const adminAll = searchParams.get("adminAll") === "true";

        const session = await getServerSession(authOptions);
        const isAdmin = session?.user?.role === "ADMIN";

        // Logic for fetching:
        // 1. Featured -> No auth required
        // 2. adminAll -> Requires ADMIN role
        // 3. User timelines -> Requires logged in user
        
        let whereClause = {};

        if (featured) {
            whereClause = { isFeatured: true };
        } else if (adminAll) {
            if (!isAdmin) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            // No filter for adminAll, fetch everything
            whereClause = {};
        } else {
            if (!session || !session.user?.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            whereClause = { userId: session.user.id };
        }

        const timelines = await prisma.timeline.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        email: true
                    }
                },
                _count: {
                    select: {
                        timelineEvents: true,
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