// src/auth/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const configApiKey = this.configService.get<string>(
      'API_KEY',
      'pbx-admin-secret-key',
    );

    if (!apiKey || apiKey !== configApiKey) {
      throw new UnauthorizedException(
        'API key không hợp lệ hoặc không được cung cấp',
      );
    }

    // Thêm thông tin vào request để sử dụng trong controllers nếu cần
    request.admin = {
      isAdmin: true,
    };

    return true;
  }
}
