// src/cdr/schemas/cdr.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CDRDocument = CDR & Document;

@Schema({ timestamps: true })
export class CDR {
  @Prop({ required: true, unique: true })
  uniqueid: string;

  @Prop({ required: true })
  src: string;

  @Prop({ required: true })
  dst: string;

  @Prop()
  dcontext: string;

  @Prop()
  clid: string;

  @Prop()
  channel: string;

  @Prop()
  dstchannel: string;

  @Prop()
  lastapp: string;

  @Prop()
  lastdata: string;

  @Prop({ required: true })
  start: Date;

  @Prop()
  answer: Date;

  @Prop()
  end: Date;

  @Prop({ required: true })
  duration: number;

  @Prop({ required: true })
  billsec: number;

  @Prop({ required: true })
  disposition: string;

  @Prop()
  amaflags: number;

  @Prop()
  accountcode: string;

  @Prop()
  userfield: string;

  @Prop()
  recordingfile: string;
}

export const CDRSchema = SchemaFactory.createForClass(CDR);
