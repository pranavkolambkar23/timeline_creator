import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // ✅ Promise
) {
    try {
        const { id } = await params; // ✅ MUST await

        console.log("API ID:", id);

        if (!id) {
            return NextResponse.json(
                { error: "Missing ID" },
                { status: 400 }
            );
        }

        const timeline = await prisma.timeline.findUnique({
            where: { id },
            include: {
                timelineEvents: {
                    orderBy: { date: "asc" },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });

        if (!timeline) {
            return NextResponse.json(
                { error: "Timeline not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(timeline);
    } catch (error) {
        console.error("GET TIMELINE ERROR:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

// 🔐 PATCH → Toggle Featured (Admin Only)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        // 1. Check if user is logged in AND is an ADMIN
        if (!session || session.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { isFeatured } = body;

        const updatedTimeline = await prisma.timeline.update({
            where: { id },
            data: { isFeatured: !!isFeatured },
        });

        return NextResponse.json(updatedTimeline);
    } catch (error) {
        console.error("PATCH TIMELINE ERROR:", error);
        return NextResponse.json({ error: "Failed to update timeline" }, { status: 500 });
    }
}

// 🔐 PUT → Full Update (Title, Desc, Events, Spatial Data)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, category, tags, events } = body;

        // 1. Check ownership (Strict: ONLY creator can edit)
        const existing = await prisma.timeline.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden. Only the creator can edit this narrative." }, { status: 403 });
        }

        // 2. Perform update in a transaction (timeout raised to 30s for large GeoJSON payloads)
        const updatedTimeline = await prisma.$transaction(async (tx) => {
            // Delete existing events first
            await tx.timelineEvent.deleteMany({
                where: { timelineId: id }
            });

            // Then update timeline metadata + create fresh events
            return await tx.timeline.update({
                where: { id },
                data: {
                    title,
                    description,
                    category,
                    tags,
                    timelineEvents: {
                        create: events.map((event: any) => ({
                            title: event.title,
                            description: event.description,
                            date: new Date(event.date),
                            locationData: event.locationData ?? null,
                        }))
                    }
                },
                include: {
                    timelineEvents: true
                }
            });
        }, { timeout: 30000 }); // ← 30 second timeout for large spatial payloads


        return NextResponse.json(updatedTimeline);
    } catch (error) {
        console.error("PUT TIMELINE ERROR:", error);
        return NextResponse.json({ error: "Failed to update timeline" }, { status: 500 });
    }
}

// 🔐 DELETE → Delete a Timeline
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check ownership (Strict: ONLY creator can delete, or Admin)
        const existing = await prisma.timeline.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!existing) {
            return NextResponse.json({ error: "Timeline not found" }, { status: 404 });
        }

        if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden. Only the creator or admin can delete." }, { status: 403 });
        }

        await prisma.timeline.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Timeline deleted successfully" });
    } catch (error) {
        console.error("DELETE TIMELINE ERROR:", error);
        return NextResponse.json({ error: "Failed to delete timeline" }, { status: 500 });
    }
}