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