// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Extension,
  ExtensionDocument,
} from '../extensions/schemas/extension.schema';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectModel(Extension.name)
    private extensionModel: Model<ExtensionDocument>,
  ) {}

  @Post('verify-extension')
  async verifyExtension(
    @Body() credentials: { extension: string; secret: string },
  ) {
    const { extension, secret } = credentials;

    if (!extension || !secret) {
      throw new HttpException(
        'Extension và secret không được để trống',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const extensionData = await this.extensionModel
        .findOne({
          extension: extension,
        })
        .exec();

      if (!extensionData) {
        throw new UnauthorizedException('Extension không tồn tại');
      }

      if (extensionData.secret === secret) {
        return {
          valid: true,
          extension: {
            _id: extensionData._id,
            extension: extensionData.extension,
            name: extensionData.name,
          },
        };
      }

      throw new UnauthorizedException('Secret không hợp lệ');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Thông tin extension không hợp lệ');
    }
  }
}
