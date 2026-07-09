import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const getCollectionInclude = (tenantTag?: string | null) => ({
    collectionEvents: {
        orderBy: { position: "asc" as const },
        where: tenantTag ? {
            event: {
                timeline: {
                    tags: { has: tenantTag }
                }
            }
        } : undefined,
        include: {
            event: {
                include: {
                    timeline: {
                        select: { id: true, title: true, category: true, tags: true },
                    },
                },
            },
        },
    },
});

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") === "personal" ? "PERSONAL" : "FEATURED";
    const session = await getServerSession(authOptions);
    const tenantTag = req.headers.get("x-tenant-tag");

    if (scope === "PERSONAL" && !session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let whereClause: any = scope === "FEATURED"
        ? { scope }
        : { scope, userId: session!.user.id };

    if (tenantTag) {
        whereClause = {
            ...whereClause,
            collectionEvents: {
                some: {
                    event: {
                        timeline: {
                            tags: { has: tenantTag }
                        }
                    }
                }
            }
        };
    }

    const collections = await prisma.collection.findMany({
        where: whereClause,
        include: getCollectionInclude(tenantTag),
        orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(collections);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const scope = body.scope === "FEATURED" ? "FEATURED" : "PERSONAL";
    if (scope === "FEATURED" && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can create featured collections" }, { status: 403 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
        return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    const tenantTag = req.headers.get("x-tenant-tag");

    const collection = await prisma.collection.create({
        data: {
            name,
            description: typeof body.description === "string" ? body.description.trim() : "",
            scope,
            userId: session.user.id,
        },
        include: getCollectionInclude(tenantTag),
    });

    return NextResponse.json(collection, { status: 201 });
}
