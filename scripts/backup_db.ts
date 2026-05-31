import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database backup to JSON...");
  
  try {
    const backupData = {
      users: await prisma.user.findMany(),
      timelines: await prisma.timeline.findMany(),
      timelineEvents: await prisma.timelineEvent.findMany(),
      accounts: await prisma.account.findMany(),
      sessions: await prisma.session.findMany(),
      feedbacks: await prisma.feedback.findMany(),
    };

    const backupFilePath = path.join(process.cwd(), "db_backup.json");
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf-8");
    
    console.log(`\n✅ Backup successfully created!`);
    console.log(`Location: ${backupFilePath}`);
    console.log(`\nStats:`);
    console.log(`- Users: ${backupData.users.length}`);
    console.log(`- Timelines: ${backupData.timelines.length}`);
    console.log(`- Timeline Events: ${backupData.timelineEvents.length}`);
    console.log(`- Accounts: ${backupData.accounts.length}`);
    console.log(`- Sessions: ${backupData.sessions.length}`);
    console.log(`- Feedbacks: ${backupData.feedbacks.length}`);
  } catch (error) {
    console.error("❌ Failed to export data:", error);
  }
}

main()
  .catch((e) => {
    console.error("❌ Unexpected error during backup:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
