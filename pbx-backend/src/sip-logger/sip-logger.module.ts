// src/sip-logger/sip-logger.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SipLoggerController } from './sip-logger.controller';
import { SipLoggerService } from './sip-logger.service';
import { SipLog, SipLogSchema } from './schemas/sip-log.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SipLog.name, schema: SipLogSchema }]),
    ConfigModule,
  ],
  controllers: [SipLoggerController],
  providers: [SipLoggerService],
  exports: [SipLoggerService],
})
export class SipLoggerModule {}
