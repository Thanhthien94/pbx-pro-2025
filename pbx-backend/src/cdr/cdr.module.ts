// src/cdr/cdr.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CDRController } from './cdr.controller';
import { CDRService } from './cdr.service';
import { CDR, CDRSchema } from './schemas/cdr.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: CDR.name, schema: CDRSchema }])],
  controllers: [CDRController],
  providers: [CDRService],
  exports: [CDRService],
})
export class CdrModule {}
