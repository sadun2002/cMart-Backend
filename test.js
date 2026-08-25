const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const order = await prisma.onlineOrder.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log('Latest Order Payment Method:', order.paymentMethod);
}
run();
