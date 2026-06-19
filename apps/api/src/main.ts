import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API Server is running on http://localhost:${port}/api`);
}
bootstrap();
