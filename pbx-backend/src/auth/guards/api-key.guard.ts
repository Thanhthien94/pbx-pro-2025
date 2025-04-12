// src/auth/guards/api-key.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key không được cung cấp');
    }

    try {
      // Gọi đến API của CRM để xác thực apiKey
      const crmApiUrl = this.configService.get<string>('crm.apiUrl');
      const response = await axios.post(`${crmApiUrl}/validate-api-key`, {
        apiKey,
      });

      // Lưu thông tin người dùng vào request
      if (response.data.valid) {
        request.user = response.data.user;
        return true;
      }

      throw new UnauthorizedException('API key không hợp lệ');
    } catch (error) {
      throw new UnauthorizedException('Không thể xác thực API key');
    }
  }
}
