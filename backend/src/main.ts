import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const globalPrefix = process.env.API_GLOBAL_PREFIX?.trim();

  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix);
  }

  const expressInstance = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };
  expressInstance.set?.('trust proxy', 1);
  app.enableCors({
    origin:
      process.env.FRONTEND_URL?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? true,
    credentials: true,
  });
  // Needed for Apple form_post callbacks (x-www-form-urlencoded)
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
