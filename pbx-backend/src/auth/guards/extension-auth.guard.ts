// src/auth/guards/extension-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Extension,
  ExtensionDocument,
} from '../../extensions/schemas/extension.schema';

@Injectable()
export class ExtensionAuthGuard implements CanActivate {
  constructor(
    @InjectModel(Extension.name)
    private extensionModel: Model<ExtensionDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const extensionId = request.headers['x-extension-id'];
    const extensionSecret = request.headers['x-extension-secret'];

    if (!extensionId || !extensionSecret) {
      throw new UnauthorizedException('Thông tin xác thực không được cung cấp');
    }

    try {
      // Tìm extension trong cơ sở dữ liệu
      const extension = await this.extensionModel
        .findOne({
          extension: extensionId,
        })
        .exec();

      // Kiểm tra secret
      if (extension && extension.secret === extensionSecret) {
        // Thêm thông tin extension vào request
        request.extension = extension;
        return true;
      }

      throw new UnauthorizedException('Thông tin xác thực không hợp lệ');
    } catch (error) {
      throw new UnauthorizedException('Không thể xác thực extension');
    }
  }
}
