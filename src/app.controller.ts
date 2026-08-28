import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { Public } from './auth/decorators/public.decorator';
import { COMPANY_NAME } from './common/constants';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  getHello() {
    return {
      name: `${COMPANY_NAME} API`,
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Tauri Auto-Updater Endpoint
  @Public()
  @Get('api/releases/latest/:target/:arch/:current_version')
  async getLatestRelease(
    @Param('target') target: string,
    @Param('arch') arch: string,
    @Param('current_version') current_version: string,
    @Res() res: any
  ) {
    const platformStr = `${target}-${arch}`; // e.g. windows-x86_64
    
    // Get the latest release for this platform
    const latestRelease = await this.prisma.release.findFirst({
      where: { target: platformStr },
      orderBy: { pub_date: 'desc' },
    });

    if (!latestRelease) {
      // 204 No Content means no update available
      return res.status(204).send(); 
    }

    // A simple version comparison logic
    const current = current_version.replace(/[^0-9.]/g, '').split('.').map(Number);
    const latest = latestRelease.version.replace(/[^0-9.]/g, '').split('.').map(Number);
    
    let isNewer = false;
    for (let i = 0; i < 3; i++) {
      const c = current[i] || 0;
      const l = latest[i] || 0;
      if (l > c) {
        isNewer = true;
        break;
      } else if (l < c) {
        break;
      }
    }

    if (!isNewer) {
      // 204 No Content
      return res.status(204).send();
    }

    // Tauri expects this exact JSON structure
    return res.status(200).json({
      version: latestRelease.version,
      notes: latestRelease.notes || '',
      pub_date: latestRelease.pub_date.toISOString(),
      platforms: {
        [latestRelease.target]: {
          signature: latestRelease.signature,
          url: latestRelease.url,
        },
      },
    });
  }

  // Web Download Endpoint (Friendly Filename & Proper headers for .exe Icon)
  @Public()
  @Get('api/releases/download/:target')
  async downloadLatestRelease(
    @Param('target') target: string,
    @Res() res: Response
  ) {
    const latestRelease = await this.prisma.release.findFirst({
      where: { target },
      orderBy: { pub_date: 'desc' },
    });

    if (!latestRelease) {
      return res.status(404).json({ message: 'No release found for this platform' });
    }

    const urlParts = latestRelease.url.split('/');
    const fileName = urlParts[urlParts.length - 1]; 
    const filePath = join(__dirname, '..', 'uploads', 'releases', fileName);

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'The setup file for this release is missing on the server.' });
    }

    const friendlyName = `cMart_POS_v${latestRelease.version}_${target}.exe`;

    res.download(filePath, friendlyName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Failed to download file' });
      }
    });
  }

  // Dashboard Download Endpoint by ID
  @Public()
  @Get('api/releases/:id/download')
  async downloadReleaseById(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const release = await this.prisma.release.findUnique({
      where: { id: +id },
    });

    if (!release) {
      return res.status(404).json({ message: 'Release not found' });
    }

    const urlParts = release.url.split('/');
    const fileName = urlParts[urlParts.length - 1]; 
    const filePath = join(__dirname, '..', 'uploads', 'releases', fileName);

    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'The setup file for this release is missing on the server.' });
    }

    const friendlyName = `cMart_POS_v${release.version}_${release.target}.exe`;

    res.download(filePath, friendlyName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Failed to download file' });
      }
    });
  }
}
