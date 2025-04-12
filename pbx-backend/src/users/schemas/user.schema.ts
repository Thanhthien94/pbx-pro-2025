// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ enum: ['admin', 'user'], default: 'user' })
  role: string;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  lastLogin: Date;

  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Hooks
UserSchema.pre('save', async function (next) {
  const user = this as UserDocument;

  if (!user.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
