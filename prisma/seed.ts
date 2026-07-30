import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding cMart database...');

  // ─── Super Admin ─────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12); // CHANGE THIS!
  const admin = await prisma.superAdmin.upsert({
    where: { email: 'admin@cmart.lk' },
    update: {},
    create: {
      email: 'admin@cmart.lk',
      password: adminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Super Admin: ${admin.email}`);

  // ─── Demo Store Owner ─────────────────────────────────────
  const ownerPassword = await bcrypt.hash('owner123', 12);
  const demoOwner = await prisma.user.upsert({
    where: { email: 'demo@cmart.lk' },
    update: {},
    create: {
      email: 'demo@cmart.lk',
      password: ownerPassword,
      name: 'Demo Store Owner',
      role: 'STORE_OWNER',
    },
  });

  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      businessName: 'Demo Store',
      subdomain: 'demo',
      ownerId: demoOwner.id,
    },
  });

  await prisma.user.update({
    where: { id: demoOwner.id },
    data: { tenantId: demoTenant.id },
  });

  // Default settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: { tenantId: demoTenant.id },
  });

  // Trial subscription
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      plan: 'FREE',
      status: 'TRIAL',
      trialEndDate: trialEnd,
    },
  });

  console.log(`✅ Demo Owner: demo@cmart.lk (password: owner123)`);
  console.log(`✅ Demo Tenant: ${demoTenant.subdomain}.cmart.lk`);

  // ─── Demo Employee ────────────────────────────────────────
  const empPassword = await bcrypt.hash('emp123', 12);
  const demoEmployee = await prisma.user.upsert({
    where: { email: 'cashier@demo.cmart.lk' },
    update: {},
    create: {
      email: 'cashier@demo.cmart.lk',
      password: empPassword,
      name: 'Demo Cashier',
      role: 'EMPLOYEE',
      tenantId: demoTenant.id,
    },
  });

  await prisma.employee.upsert({
    where: { userId: demoEmployee.id },
    update: {},
    create: {
      userId: demoEmployee.id,
      tenantId: demoTenant.id,
      employeeCode: 'EMP-001',
      position: 'CASHIER',
      permissions: {
        canProcessSales: true,
        canViewProducts: true,
        canAddProducts: false,
        canEditProducts: false,
        canDeleteProducts: false,
        canViewCustomers: true,
        canAddCustomers: true,
        canViewReports: false,
        canViewAllSales: false,
        canManageInventory: false,
        canManageEmployees: false,
      },
    },
  });

  console.log(`✅ Demo Cashier: cashier@demo.cmart.lk (password: emp123)`);

  // ─── Demo Categories ──────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: demoTenant.id, slug: 'clothing' } },
      update: {},
      create: { tenantId: demoTenant.id, name: 'Clothing', slug: 'clothing' },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: demoTenant.id, slug: 'footwear' } },
      update: {},
      create: { tenantId: demoTenant.id, name: 'Footwear', slug: 'footwear' },
    }),
    prisma.category.upsert({
      where: { tenantId_slug: { tenantId: demoTenant.id, slug: 'accessories' } },
      update: {},
      create: { tenantId: demoTenant.id, name: 'Accessories', slug: 'accessories' },
    }),
  ]);

  console.log(`✅ ${categories.length} demo categories created`);

  // ─── Demo Products ────────────────────────────────────────
  const products = [
    { name: 'Blue Denim Jeans (32)', price: 4500, cost: 2500, stock: 25, barcode: 'BDJ32001', categoryId: categories[0].id },
    { name: 'White Cotton T-Shirt (L)', price: 1200, cost: 600, stock: 50, barcode: 'WCT001L', categoryId: categories[0].id },
    { name: 'Black Sneakers Size 42', price: 8900, cost: 5000, stock: 12, barcode: 'BS42001', categoryId: categories[1].id },
    { name: 'Leather Belt (Brown)', price: 2200, cost: 900, stock: 8, barcode: 'LBB001', categoryId: categories[2].id },
    { name: 'Casual Dress (M)', price: 6500, cost: 3200, stock: 15, barcode: 'CD001M', categoryId: categories[0].id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: demoTenant.id, slug: p.name.toLowerCase().replace(/[^a-z0-9]/g, '-') } },
      update: {},
      create: {
        tenantId: demoTenant.id,
        name: p.name,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        barcode: p.barcode,
        categoryId: p.categoryId,
        showOnWebsite: true,
        unit: 'pcs',
      },
    });
  }

  console.log(`✅ ${products.length} demo products created`);
  console.log('\n🎉 Seed completed!');
  console.log('\n─── Login Credentials ───────────────────────────────');
  console.log('  Super Admin: admin@cmart.lk / admin123');
  console.log('  Store Owner: demo@cmart.lk / owner123');
  console.log('  Cashier:     cashier@demo.cmart.lk / emp123');
  console.log('─────────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
