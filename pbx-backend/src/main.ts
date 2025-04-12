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
    origin: configService.get<string>('cors.origin', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Cấu hình validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các trường không được định nghĩa trong DTO
      forbidNonWhitelisted: true, // Báo lỗi khi gặp trường không được định nghĩa
      transform: true, // Tự động chuyển đổi kiểu dữ liệu
    }),
  );

  // Lấy port từ config hoặc mặc định là 3000
  const port = configService.get<number>('port', 3000);

  await app.listen(port);
  console.log(`Ứng dụng đang chạy tại: http://localhost:${port}/api`);
}

bootstrap();
