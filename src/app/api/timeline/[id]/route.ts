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