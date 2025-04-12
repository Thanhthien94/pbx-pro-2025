// src/auth/guards/bypass-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class BypassAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Luôn cho phép mọi request đi qua
    const request = context.switchToHttp().getRequest();

    // Tạo một user mặc định cho các API yêu cầu thông tin user
    request.user = {
      id: '1',
      username: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    };

    return true;
  }
}
