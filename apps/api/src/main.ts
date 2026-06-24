import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

let cachedServer: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API routing prefix
  app.setGlobalPrefix('api');

  // Enable Cross-Origin Resource Sharing
  app.enableCors();

  // Enforce validation globally with DTO type transforming
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;

  if (isVercel) {
    await app.init();
    return app.getHttpAdapter().getInstance();
  } else {
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 API Server is running on http://localhost:${port}/api`);
  }
}

// Start server if not running on Vercel serverless
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
if (!isVercel) {
  void bootstrap();
}

// Export serverless handler for Vercel
export default async (req: any, res: any) => {
  if (!cachedServer) {
    cachedServer = await bootstrap();
  }
  return cachedServer(req, res);
};

