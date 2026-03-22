import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  carePlanId: string;
  senderId: string;
  receiverId: string;
  content: string;
  translations?: Record<string, string>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    carePlanId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    translations: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ carePlanId: 1, createdAt: 1 });
MessageSchema.index({ carePlanId: 1, senderId: 1, receiverId: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
