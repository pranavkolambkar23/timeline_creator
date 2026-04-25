import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) return;

    // 1. Detailed Shivaji Maharaj Timeline
    await prisma.timeline.updateMany({ where: { title: { contains: "Shivaji" } }, data: { title: "Chhatrapati Shivaji Maharaj: The Great Maratha" } });
    const shivaji = await prisma.timeline.findFirst({ where: { title: { contains: "Shivaji" } } });
    
    if (shivaji) {
        await prisma.timelineEvent.deleteMany({ where: { timelineId: shivaji.id } });
        await prisma.timelineEvent.createMany({
            data: [
                { timelineId: shivaji.id, title: "Birth at Shivneri", description: "Born to Shahaji Raje and Jijabai at the Shivneri Fort.", date: new Date("1630-02-19"), displayDate: "Feb 19, 1630" },
                { timelineId: shivaji.id, title: "Conquest of Torna", description: "Captured Torna Fort at age 16, his first major military victory.", date: new Date("1646-01-01"), displayDate: "1646" },
                { timelineId: shivaji.id, title: "Victory over Afzal Khan", description: "A legendary encounter at Pratapgad where he defeated the Bijapur general.", date: new Date("1659-11-10"), displayDate: "Nov 10, 1659" },
                { timelineId: shivaji.id, title: "Battle of Pavan Khind", description: "Baji Prabhu Deshpande's heroic last stand to ensure Shivaji's escape.", date: new Date("1660-07-13"), displayDate: "July 13, 1660" },
                { timelineId: shivaji.id, title: "Raid on Shaista Khan", description: "A daring surprise attack on the Mughal general in Pune.", date: new Date("1663-04-05"), displayDate: "April 5, 1663" },
                { timelineId: shivaji.id, title: "Treaty of Purandar", description: "Forced to sign a treaty with Jai Singh I, ceding many forts.", date: new Date("1665-06-11"), displayDate: "June 11, 1665" },
                { timelineId: shivaji.id, title: "Escape from Agra", description: "One of the most thrilling escapes in history, from Aurangzeb's custody.", date: new Date("1666-08-17"), displayDate: "Aug 17, 1666" },
                { timelineId: shivaji.id, title: "Coronation at Raigad", description: "Formally crowned as Chhatrapati, founding the Maratha Empire.", date: new Date("1674-06-06"), displayDate: "June 6, 1674" },
                { timelineId: shivaji.id, title: "Southern Expedition", description: "Campaign into the Carnatic, capturing Gingee and Vellore.", date: new Date("1677-01-01"), displayDate: "1677-78" },
                { timelineId: shivaji.id, title: "Death at Raigad", description: "The Great Maratha King passed away at Raigad Fort.", date: new Date("1680-04-03"), displayDate: "April 3, 1680" },
            ]
        });
    }

    // 2. Detailed Android Evolution
    const android = await prisma.timeline.findFirst({ where: { title: { contains: "Android" } } });
    if (android) {
        await prisma.timelineEvent.deleteMany({ where: { timelineId: android.id } });
        await prisma.timelineEvent.createMany({
            data: [
                { timelineId: android.id, title: "The Beginning", description: "Android Inc. was founded by Andy Rubin and others.", date: new Date("2003-10-01"), displayDate: "Oct 2003" },
                { timelineId: android.id, title: "Google Acquisition", description: "Google bought Android Inc., starting the mobile revolution.", date: new Date("2005-07-11"), displayDate: "July 2005" },
                { timelineId: android.id, title: "Android 1.0 Astro", description: "Released on the T-Mobile G1 (HTC Dream).", date: new Date("2008-09-23"), displayDate: "Sept 2008" },
                { timelineId: android.id, title: "Android 1.5 Cupcake", description: "Introduced the on-screen keyboard and widgets.", date: new Date("2009-04-27"), displayDate: "April 2009" },
                { timelineId: android.id, title: "Android 2.0 Eclair", description: "Brought Google Maps Navigation and multi-touch support.", date: new Date("2009-10-26"), displayDate: "Oct 2009" },
                { timelineId: android.id, title: "Android 4.0 Ice Cream Sandwich", description: "Unified phone and tablet UIs with a modern 'Holo' look.", date: new Date("2011-10-19"), displayDate: "Oct 2011" },
                { timelineId: android.id, title: "Android 5.0 Lollipop", description: "Introduction of 'Material Design'.", date: new Date("2014-11-12"), displayDate: "Nov 2014" },
                { timelineId: android.id, title: "Android 8.0 Oreo", description: "Project Treble introduced to speed up system updates.", date: new Date("2017-08-21"), displayDate: "Aug 2017" },
                { timelineId: android.id, title: "Android 10", description: "Google dropped dessert names and added Dark Mode.", date: new Date("2019-09-03"), displayDate: "Sept 2019" },
                { timelineId: android.id, title: "Android 12 Material You", description: "A massive visual redesign with dynamic color themes.", date: new Date("2021-10-04"), displayDate: "Oct 2021" },
                { timelineId: android.id, title: "Android 15", description: "Focusing on AI integration and satellite connectivity.", date: new Date("2024-05-01"), displayDate: "2024" },
            ]
        });
    }

    console.log("🚀 Deep content seeded!");
}

main().finally(() => prisma.$disconnect());
