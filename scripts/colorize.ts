import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Update WW2
    await prisma.timeline.updateMany({
        where: { title: { contains: "World War" } },
        data: { 
            category: "History",
            tags: ["war", "global", "military"]
        }
    });

    // Update Shivaji
    await prisma.timeline.updateMany({
        where: { title: { contains: "Shivaji" } },
        data: { 
            category: "History",
            tags: ["india", "maratha", "hero"]
        }
    });

    // Update Android
    await prisma.timeline.updateMany({
        where: { title: { contains: "Android" } },
        data: { 
            category: "Technology",
            tags: ["os", "google", "mobile"]
        }
    });

    console.log("🎨 Database colorized with categories and tags!");
}

main().finally(() => prisma.$disconnect());
