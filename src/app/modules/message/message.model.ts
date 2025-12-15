import mongoose, { model, Schema } from 'mongoose';
import { IMessage, IEncryptedField } from './message.interface';

// 🔒 Sub-schema for encrypted fields
const EncryptedFieldSchema = new Schema<IEncryptedField>(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
  },
  { _id: false } // prevent Mongoose from creating _id for each encrypted object
);

const messageSchema = new Schema<IMessage>(
  {
    text: {
      type: EncryptedFieldSchema,
      required: false,
    },
    imageUrl: {
      type: [EncryptedFieldSchema],
      required:false,
      default: [],
    },
    audioUrl: {
      type: EncryptedFieldSchema,
      required:false,
      default: null,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    ephemPublicKey: {
      type: String,
      required: [true, 'ephemPublicKey is required'],
    },
    msgByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'users',
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'conversations',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const messages = model<IMessage>('messages', messageSchema);

export default messages;
