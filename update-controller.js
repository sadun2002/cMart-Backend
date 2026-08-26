const fs = require('fs');
const file = 'src/app.controller.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the download method to handle missing files
content = content.replace(
  /const urlParts = latestRelease\.url\.split\('\/'\);[\s\S]*?return res\.download\(filePath, friendlyName\);/,
  \const urlParts = latestRelease.url.split('/');
    const fileName = urlParts[urlParts.length - 1]; 
    const filePath = join(process.cwd(), 'uploads', 'releases', fileName);

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('The setup file for this release is missing on the server.');
    }

    const friendlyName = \\\cMart_POS_v\_\.exe\\\;
    return res.download(filePath, friendlyName);\
);

fs.writeFileSync(file, content);
