import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? true,
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}
bootstrap();
