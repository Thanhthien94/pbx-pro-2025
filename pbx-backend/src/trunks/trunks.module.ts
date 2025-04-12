// src/trunks/trunks.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrunksController } from './trunks.controller';
import { TrunksService } from './trunks.service';
import { Trunk, TrunkSchema } from './schemas/trunk.schema';
import { AsteriskModule } from '../asterisk/asterisk.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trunk.name, schema: TrunkSchema }]),
    AsteriskModule,
  ],
  controllers: [TrunksController],
  providers: [TrunksService],
  exports: [TrunksService],
})
export class TrunksModule {}
