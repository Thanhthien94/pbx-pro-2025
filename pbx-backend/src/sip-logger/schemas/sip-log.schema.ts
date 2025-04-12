// src/sip-logger/schemas/sip-log.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SipLogDocument = SipLog & Document;

@Schema({ timestamps: true })
export class SipLog {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  source_ip: string;

  @Prop({ required: true })
  destination_ip: string;

  @Prop({ required: true })
  method: string;

  @Prop()
  call_id: string;

  @Prop()
  from_user: string;

  @Prop()
  to_user: string;

  @Prop()
  status_code: number;

  @Prop()
  reason_phrase: string;

  @Prop({ type: Object })
  headers: Record<string, any>;

  @Prop()
  body: string;

  @Prop({ default: 'inbound' })
  direction: string;
}

export const SipLogSchema = SchemaFactory.createForClass(SipLog);
