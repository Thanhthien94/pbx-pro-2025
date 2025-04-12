// src/asterisk/asterisk.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AsteriskService } from './asterisk.service';
import { AsteriskController } from './asterisk.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AsteriskController],
  providers: [AsteriskService],
  exports: [AsteriskService],
})
export class AsteriskModule {}
