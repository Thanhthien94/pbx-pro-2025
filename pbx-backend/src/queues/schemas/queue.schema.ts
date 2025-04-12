// src/queues/schemas/queue.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QueueDocument = Queue & Document;

@Schema({ timestamps: true })
export class Queue {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({
    default: 'ringall',
    enum: [
      'ringall',
      'leastrecent',
      'fewestcalls',
      'random',
      'rrmemory',
      'linear',
      'wrandom',
    ],
  })
  strategy: string;

  @Prop({ default: 15 })
  timeout: number;

  @Prop({ default: 0 })
  wrapuptime: number;

  @Prop({ default: 0 })
  maxlen: number;

  @Prop()
  announce: string;

  @Prop({ type: [String], default: [] })
  members: string[];

  @Prop({ default: 'default' })
  musicClass: string;
}

export const QueueSchema = SchemaFactory.createForClass(Queue);
