import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  // Needed for Apple form_post callbacks (x-www-form-urlencoded)
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
