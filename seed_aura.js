const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.superAdmin.findFirst({ where: { email: 'admin@cmart.lk' } });
  
  if (!admin) {
    console.error('No Super Admin found. Cannot seed theme without an uploader.');
    return;
  }

  const auraTheme = await prisma.theme.upsert({
    where: { slug: 'aura' },
    update: {
      previewUrl: '/s/demo?theme=aura',
      price: 6000,
    },
    create: {
      name: 'Aura',
      slug: 'aura',
      description: 'A premium, high-fashion / editorial theme focusing on sharp edges, high contrast, and editorial spacing. Perfect for luxury and fashion stores.',
      price: 6000,
      type: 'PREMIUM',
      isActive: true,
      tags: ['premium', 'fashion', 'luxury', 'editorial'],
      version: '1.0.0',
      uploadedById: admin.id,
      previewUrl: '/s/demo?theme=aura',
    }
  });

  console.log('Seeded Aura theme to database:', auraTheme.name);
}
main().catch(console.error).finally(() => prisma.$disconnect());
