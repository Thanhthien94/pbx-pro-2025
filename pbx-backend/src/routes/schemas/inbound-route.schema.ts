// src/routes/schemas/inbound-route.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InboundRouteDocument = InboundRoute & Document;

@Schema({ timestamps: true })
export class InboundRoute {
  @Prop({ required: true })
  name: string;

  @Prop()
  did: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ required: true, enum: ['extension', 'queue', 'ivr'] })
  destinationType: string;

  @Prop()
  callerIdName: string;

  @Prop({ default: 0 })
  priority: number;
}

export const InboundRouteSchema = SchemaFactory.createForClass(InboundRoute);
