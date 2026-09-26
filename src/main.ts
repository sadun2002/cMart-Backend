import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

  // Serve static uploads properly in NestJS
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Rewrite legacy Tauri updater URL (v0.1.0) to the correct one so the old app can update
  app.use((req: any, res: any, next: any) => {
    if (req.url.startsWith('/api/releases/latest')) {
      req.url = req.url.replace('/api/releases/latest', '/api/v1/api/releases/latest');
    }
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown props
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform to DTO classes
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — allow frontend + subdomain storefronts + mobile & desktop
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = 
        origin === frontendUrl ||
        origin.includes('chathudisa.com') ||
        origin.includes('cmart.lk') ||
        origin.includes('vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.startsWith('tauri://') ||
        origin.startsWith('https://tauri.localhost');

      callback(null, isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 cMart API running on port ${port} (0.0.0.0)`, 'Bootstrap');
}

bootstrap();
