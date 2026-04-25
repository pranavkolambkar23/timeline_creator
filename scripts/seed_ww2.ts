import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // 1. Get the first user to assign the timeline to
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error("❌ No user found in the database. Please register a user first!");
        return;
    }

    console.log(`✅ Found user: ${user.email}. Creating WW2 timeline...`);

    // 2. Create the World War 2 timeline
    const ww2Timeline = await prisma.timeline.create({
        data: {
            title: "World War II: The Global Conflict",
            description: "A comprehensive look at the major events, battles, and turning points of the Second World War (1939-1945).",
            userId: user.id,
            isFeatured: true, // 🔥 Mark as featured for the homepage
            timelineEvents: {
                create: [
                    {
                        title: "Germany Invades Poland",
                        description: "German forces under Hitler invade Poland, marking the official beginning of World War II.",
                        date: new Date("1939-09-01"),
                        displayDate: "September 1, 1939",
                    },
                    {
                        title: "Fall of France",
                        description: "German forces bypass the Maginot Line and successfully occupy Paris and northern France.",
                        date: new Date("1940-06-22"),
                        displayDate: "June 22, 1940",
                    },
                    {
                        title: "Attack on Pearl Harbor",
                        description: "The Japanese Navy launches a surprise military strike against the United States naval base at Pearl Harbor, Hawaii.",
                        date: new Date("1941-12-07"),
                        displayDate: "December 7, 1941",
                    },
                    {
                        title: "Battle of Stalingrad",
                        description: "The Soviet Union successfully defends the city of Stalingrad against Nazi forces, marking a major turning point in the war.",
                        date: new Date("1942-08-23"),
                        displayDate: "August 23, 1942",
                    },
                    {
                        title: "D-Day: Invasion of Normandy",
                        description: "Allied forces launch the largest seaborne invasion in history, landing on the beaches of Normandy, France.",
                        date: new Date("1944-06-06"),
                        displayDate: "June 6, 1944",
                    },
                    {
                        title: "Victory in Europe Day",
                        description: "Germany signs an unconditional surrender, marking the end of the war in Europe.",
                        date: new Date("1945-05-08"),
                        displayDate: "May 8, 1945",
                    },
                    {
                        title: "Atomic Bombing of Hiroshima",
                        description: "The United States drops an atomic bomb on Hiroshima, Japan, to force an end to the Pacific War.",
                        date: new Date("1945-08-06"),
                        displayDate: "August 6, 1945",
                    },
                    {
                        title: "Victory over Japan Day",
                        description: "Japan formally surrenders, bringing an end to World War II globally.",
                        date: new Date("1945-09-02"),
                        displayDate: "September 2, 1945",
                    },
                ],
            },
        },
    });

    console.log(`🚀 Successfully created WW2 Timeline with ID: ${ww2Timeline.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
