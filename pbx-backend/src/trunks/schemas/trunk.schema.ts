// src/trunks/schemas/trunk.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrunkDocument = Trunk & Document;

@Schema({ timestamps: true })
export class Trunk {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: ['sip', 'pjsip', 'iax'] })
  type: string;

  @Prop({ required: true })
  host: string;

  @Prop()
  username: string;

  @Prop()
  secret: string;

  @Prop({ default: 'from-trunk' })
  context: string;

  @Prop({ default: 'rfc2833', enum: ['rfc2833', 'info', 'inband', 'auto'] })
  dtmfMode: string;

  @Prop({ default: 'udp', enum: ['udp', 'tcp', 'tls', 'ws', 'wss'] })
  transport: string;

  @Prop({ default: 'port,invite' })
  insecure: string;

  @Prop({ default: 'yes', enum: ['yes', 'no', 'force_rport', 'comedia'] })
  nat: string;

  @Prop({ default: 60 })
  qualifyFreq: number;

  @Prop({ default: 'all' })
  disallow: string;

  @Prop({ default: 'ulaw,alaw,g722' })
  allow: string;
}

export const TrunkSchema = SchemaFactory.createForClass(Trunk);
