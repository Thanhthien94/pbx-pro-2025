// src/extensions/extensions.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExtensionsController } from './extensions.controller';
import { ExtensionsService } from './extensions.service';
import { Extension, ExtensionSchema } from './schemas/extension.schema';
import { AsteriskModule } from '../asterisk/asterisk.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Extension.name, schema: ExtensionSchema },
    ]),
    AsteriskModule,
    ConfigModule,
  ],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService],
})
export class ExtensionsModule {}
