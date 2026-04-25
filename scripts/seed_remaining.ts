import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("❌ No user found. Register first!");
        return;
    }

    const timelines = [
        {
            title: "Chhatrapati Shivaji Maharaj",
            description: "The life and legacy of the founder of the Maratha Empire.",
            events: [
                { title: "Birth at Shivneri", description: "Shivaji was born to Shahaji Bhonsle and Jijabai.", date: new Date("1630-02-19") },
                { title: "Oath of Swarajya", description: "At the age of 16, Shivaji took the oath to establish an independent kingdom at Raireshwar.", date: new Date("1645-01-01") },
                { title: "Coronation at Raigad", description: "Shivaji was formally crowned as the Chhatrapati (Sovereign) of his realm.", date: new Date("1674-06-06") },
            ]
        },
        {
            title: "Evolution of Android",
            description: "A look at the major milestones in the history of the Android Operating System.",
            events: [
                { title: "Android 1.0", description: "The first commercial version of Android was released on the T-Mobile G1.", date: new Date("2008-09-23") },
                { title: "Ice Cream Sandwich", description: "A major overhaul of the UI that unified phone and tablet versions.", date: new Date("2011-10-19") },
                { title: "Android 12", description: "Introduced 'Material You' design language.", date: new Date("2021-10-04") },
            ]
        }
    ];

    for (const t of timelines) {
        await prisma.timeline.create({
            data: {
                title: t.title,
                description: t.description,
                userId: user.id,
                isFeatured: true,
                timelineEvents: {
                    create: t.events.map(e => ({
                        title: e.title,
                        description: e.description,
                        date: e.date,
                        displayDate: e.date.toDateString()
                    }))
                }
            }
        });
    }

    console.log("🚀 All featured timelines seeded to DB!");
}

main().finally(() => prisma.$disconnect());
