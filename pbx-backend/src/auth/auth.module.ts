// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Extension,
  ExtensionSchema,
} from '../extensions/schemas/extension.schema';
import { AuthController } from './auth.controller';
import { ExtensionAuthGuard } from './guards/extension-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Extension.name, schema: ExtensionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [ExtensionAuthGuard],
  exports: [ExtensionAuthGuard],
})
export class AuthModule {}
