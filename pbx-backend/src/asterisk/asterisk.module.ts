// src/asterisk/asterisk.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AsteriskService } from './asterisk.service';
import { AsteriskController } from './asterisk.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [AsteriskController],
  providers: [AsteriskService],
  exports: [AsteriskService],
})
export class AsteriskModule {}
