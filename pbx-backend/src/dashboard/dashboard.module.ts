// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import {
  Extension,
  ExtensionSchema,
} from '../extensions/schemas/extension.schema';
import { Trunk, TrunkSchema } from '../trunks/schemas/trunk.schema';
import { Queue, QueueSchema } from '../queues/schemas/queue.schema';
import { CDR, CDRSchema } from '../cdr/schemas/cdr.schema';
import { AsteriskModule } from '../asterisk/asterisk.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Extension.name, schema: ExtensionSchema },
      { name: Trunk.name, schema: TrunkSchema },
      { name: Queue.name, schema: QueueSchema },
      { name: CDR.name, schema: CDRSchema },
    ]),
    AsteriskModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
