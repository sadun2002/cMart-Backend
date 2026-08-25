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
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
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

  // CORS — allow frontend + subdomain storefronts
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman, server-to-server
      const allowedPatterns = [
        frontendUrl,
        /\.cmart\.lk$/,
        /\.chathudisa\.com$/, // Custom domain support
        /\.vercel\.app$/, // Allow all Vercel preview/production links
        /^https:\/\/c-mart-frontend\.vercel\.app$/, // Specific frontend domain
        /(localhost|127\.0\.0\.1)(:\d+)?$/, // Allow local dev and desktop app
        /^https?:\/\/tauri\.localhost$/,
        /^tauri:\/\/localhost$/,
      ];
      const allowed = allowedPatterns.some((pattern) =>
        typeof pattern === 'string' ? origin === pattern : pattern.test(origin),
      );
      callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  await app.listen(port);
  Logger.log(`🚀 cMart API running on: http://localhost:${port}/api/v1`, 'Bootstrap');
}

bootstrap();
