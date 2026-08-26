const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const version = '0.1.9';
  const target = 'windows-x86_64';
  
  // Find the latest release in DB
  const latestRelease = await prisma.release.findFirst({
    where: { target, version },
    orderBy: { pub_date: 'desc' },
  });
  
  if (!latestRelease) {
    console.error('Release 0.1.9 not found in DB!');
    return;
  }

  // Paths
  const exePath = path.join(__dirname, '../frontend/src-tauri/target/release/bundle/nsis/cMart POS_0.1.9_x64-setup.exe');
  const sigPath = path.join(__dirname, '../frontend/src-tauri/target/release/bundle/nsis/cMart POS_0.1.9_x64-setup.exe.sig');
  
  if (!fs.existsSync(exePath) || !fs.existsSync(sigPath)) {
    console.error('Built files not found. Are you sure the build completed?');
    return;
  }
  
  // Generate unique names
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const exeName = uniqueSuffix + '.exe';
  const destExe = path.join(__dirname, 'uploads/releases', exeName);
  
  // Copy files
  fs.copyFileSync(exePath, destExe);
  const sigContent = fs.readFileSync(sigPath, 'utf8');
  
  // Update DB
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const url = `${backendUrl}/uploads/releases/${exeName}`;
  
  await prisma.release.update({
    where: { id: latestRelease.id },
    data: {
      url: url,
      signature: sigContent
    }
  });
  
  console.log('Successfully updated release in DB with new files!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
