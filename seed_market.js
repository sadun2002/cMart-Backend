const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.superAdmin.findFirst({ where: { email: 'admin@cmart.lk' } });

  if (!admin) {
    console.error('No Super Admin found. Cannot seed theme without an uploader.');
    return;
  }

  const marketTheme = await prisma.theme.upsert({
    where: { slug: 'market' },
    update: {
      previewUrl: '/s/demo?theme=market',
      price: 5500,
    },
    create: {
      name: 'Market',
      slug: 'market',
      description: 'A premium grocery storefront theme with a fresh, organic feel. Features a sticky category navigation bar, left-sidebar shop filters, flash sale offers page with countdown timer, and a full product detail page with nutrition facts.',
      price: 5500,
      type: 'PREMIUM',
      isActive: true,
      tags: ['premium', 'grocery', 'organic', 'fresh', 'market'],
      version: '1.0.0',
      uploadedById: admin.id,
      previewUrl: '/s/demo?theme=market',
    }
  });

  console.log('✅ Seeded Market theme to database:', marketTheme.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
