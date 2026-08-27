import { Controller, Get, Patch, Param, Body, UseGuards, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService
  ) {}

  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('stores')
  getAllStores() {
    return this.adminService.getAllStores();
  }

  @Patch('stores/:id/status')
  updateStoreStatus(
    @Param('id') id: string,
    @Body('suspend') suspend: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateStoreStatus(+id, suspend, reason);
  }

  @Get('payments')
  getPayments() {
    return this.adminService.getPayments();
  }

  @Get('releases')
  getAllReleases() {
    return this.adminService.getAllReleases();
  }

  @Post('releases/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = require('path').join(__dirname, '..', '..', 'uploads', 'releases');
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadReleaseFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    return { url: `${backendUrl}/uploads/releases/${file.filename}` };
  }

  @Post('releases')
  createRelease(@Body() data: { version: string; notes?: string; target?: string; url: string; signature: string }) {
    return this.adminService.createRelease(data);
  }
}
