// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cấu hình API prefix
  app.setGlobalPrefix('api');

  // Cấu hình CORS
  app.enableCors({
    origin: '*', // Cho phép tất cả các origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Cấu hình validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Lấy port từ config hoặc mặc định là 3000
  const port = configService.get<number>('port', 3000);

  await app.listen(port);
  console.log(`Ứng dụng đang chạy tại: http://localhost:${port}/api`);
  console.log(`Xác thực đã được bypass (tắt)`);
}

bootstrap();
