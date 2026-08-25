const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Updating Tenant plans...");
    await prisma.$executeRawUnsafe(`UPDATE "Tenant" SET plan = 'PRO' WHERE plan::text = 'FREE' OR plan::text = 'STARTER'`);
    
    console.log("Updating Subscription plans...");
    await prisma.$executeRawUnsafe(`UPDATE "Subscription" SET plan = 'PRO' WHERE plan::text = 'FREE' OR plan::text = 'STARTER'`);
    
    console.log("Done updating plans.");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
