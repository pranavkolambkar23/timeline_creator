import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { compareHistoricalDates } from "@/lib/historicalDate";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "featured"; // 'featured' or 'personal'

        const session = await getServerSession(authOptions);

        const tenantTag = req.headers.get("x-tenant-tag");
        let whereClause: any = {};

        if (mode === "personal") {
            if (!session || !session.user?.id) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            whereClause = {
                timeline: {
                    userId: session.user.id
                }
            };
        } else {
            // Default to featured
            whereClause = {
                timeline: {
                    isFeatured: true
                }
            };
        }

        if (tenantTag) {
            whereClause.timeline = {
                ...whereClause.timeline,
                tags: { has: tenantTag }
            };
        }

        const events = await prisma.timelineEvent.findMany({
            where: whereClause,
            include: {
                timeline: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        tags: true,
                    }
                }
            },
            orderBy: {
                date: "asc"
            }
        });

        events.sort(compareHistoricalDates);
        return NextResponse.json(events);

    } catch (error) {
        console.error("GET GLOBAL TIMELINE ERROR:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
