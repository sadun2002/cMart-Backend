import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3001;
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

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
        /localhost:\d+$/,
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
