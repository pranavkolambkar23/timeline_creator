import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("❌ No user found.");
        return;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" }
    });

    console.log(`👑 User ${user.email} is now an ADMIN!`);
}

main().finally(() => prisma.$disconnect());
