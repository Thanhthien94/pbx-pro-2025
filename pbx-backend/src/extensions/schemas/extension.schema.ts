// src/extensions/schemas/extension.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExtensionDocument = Extension & Document;

@Schema({ timestamps: true })
export class Extension {
  @Prop({ required: true, unique: true })
  extension: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  secret: string;

  @Prop({ default: 'from-internal' })
  context: string;

  @Prop({ default: 'dynamic' })
  host: string;

  @Prop()
  callGroup?: string;

  @Prop()
  pickupGroup?: string;

  @Prop()
  mailbox?: string;

  @Prop()
  email?: string;

  @Prop({ default: 'rfc2833', enum: ['rfc2833', 'info', 'inband', 'auto'] })
  dtmfMode: string;

  @Prop({ default: 'udp', enum: ['udp', 'tcp', 'tls', 'ws', 'wss'] })
  transport: string;

  @Prop({ default: 'yes', enum: ['yes', 'no', 'force_rport', 'comedia'] })
  nat: string;

  @Prop({ default: 5 })
  callLimit: number;

  @Prop({ default: 'all' })
  disallow: string;

  @Prop({ default: 'ulaw,alaw,g722' })
  allow: string;
}

export const ExtensionSchema = SchemaFactory.createForClass(Extension);
