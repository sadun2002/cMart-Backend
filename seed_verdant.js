const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.superAdmin.findFirst({ where: { email: 'admin@cmart.lk' } });
  
  if (!admin) {
    console.error('No Super Admin found. Cannot seed theme without an uploader.');
    return;
  }

  const verdantTheme = await prisma.theme.upsert({
    where: { slug: 'verdant' },
    update: {
      previewUrl: '/s/demo?theme=verdant',
      price: 5000,
    },
    create: {
      name: 'Verdant',
      slug: 'verdant',
      description: 'A premium, highly dynamic theme tailored for fresh produce and grocery stores. Features beautiful animations, a fresh garden color story, and highly rounded glassmorphic elements.',
      price: 5000,
      type: 'PREMIUM',
      isActive: true,
      tags: ['premium', 'grocery', 'fresh', 'dynamic'],
      version: '1.0.0',
      uploadedById: admin.id,
      previewUrl: '/s/demo?theme=verdant',
    }
  });

  console.log('Seeded Verdant theme from database', verdantTheme.name);
}
main().catch(console.error).finally(() => prisma.$disconnect());
