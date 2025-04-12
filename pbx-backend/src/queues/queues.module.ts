// src/queues/queues.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { Queue, QueueSchema } from './schemas/queue.schema';
import { AsteriskModule } from '../asterisk/asterisk.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Queue.name, schema: QueueSchema }]),
    AsteriskModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
