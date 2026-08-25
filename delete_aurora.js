const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.theme.deleteMany({
    where: { slug: 'aurora' }
  });
  console.log('Deleted Aurora theme from database');
}
main().catch(console.error).finally(() => prisma.$disconnect());
