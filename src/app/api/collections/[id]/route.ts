import { CollectionScope } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const collectionInclude = {
    collectionEvents: {
        orderBy: { position: "asc" as const },
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
};

async function getEditableCollection(id: string, userId: string, role: string) {
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) return null;
    if (collection.scope === "FEATURED") return role === "ADMIN" ? collection : null;
    return collection.userId === userId ? collection : null;
}

const getAllowedEventFilter = (scope: CollectionScope, userId: string) => {
    return scope === "FEATURED"
        ? { timeline: { isFeatured: true } }
        : { timeline: { userId } };
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getEditableCollection(id, session.user.id, session.user.role);
    if (!existing) {
        return NextResponse.json({ error: "Collection not found or not editable" }, { status: 404 });
    }

    const body = await req.json();
    const eventIds: string[] = Array.isArray(body.eventIds)
        ? [...new Set((body.eventIds as unknown[]).filter((eventId): eventId is string => typeof eventId === "string"))]
        : [];

    const validEvents = await prisma.timelineEvent.findMany({
        where: {
            id: { in: eventIds },
            ...getAllowedEventFilter(existing.scope, session.user.id),
        },
        select: { id: true, date: true },
    });
    const validEventIds = new Set(validEvents.map(event => event.id));
    const eventDates = new Map(validEvents.map(event => [event.id, event.date.getTime()]));
    const chronologicalEventIds = eventIds
        .filter(eventId => validEventIds.has(eventId))
        .sort((leftId, rightId) => (eventDates.get(leftId) ?? 0) - (eventDates.get(rightId) ?? 0));

    const collection = await prisma.$transaction(async tx => {
        await tx.collectionEvent.deleteMany({ where: { collectionId: id } });
        await tx.collection.update({
            where: { id },
            data: {
                name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
                description: typeof body.description === "string" ? body.description.trim() : undefined,
                collectionEvents: {
                    create: chronologicalEventIds
                        .map((eventId, position) => ({ eventId, position })),
                },
            },
        });
        return tx.collection.findUniqueOrThrow({ where: { id }, include: collectionInclude });
    });

    return NextResponse.json(collection);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!await getEditableCollection(id, session.user.id, session.user.role)) {
        return NextResponse.json({ error: "Collection not found or not editable" }, { status: 404 });
    }

    await prisma.collection.delete({ where: { id } });
    return NextResponse.json({ message: "Collection deleted" });
}
