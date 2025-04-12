// src/routes/schemas/outbound-route.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OutboundRouteDocument = OutboundRoute & Document;

@Schema({ timestamps: true })
export class OutboundRoute {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  pattern: string;

  @Prop({ required: true })
  trunk: string;

  @Prop()
  prepend: string;

  @Prop()
  prefix: string;

  @Prop()
  callerIdName: string;

  @Prop()
  callerIdNumber: string;

  @Prop({ default: 0 })
  priority: number;
}

export const OutboundRouteSchema = SchemaFactory.createForClass(OutboundRoute);
