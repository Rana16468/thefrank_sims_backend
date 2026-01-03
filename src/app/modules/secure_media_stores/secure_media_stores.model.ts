import mongoose, { model, Schema } from 'mongoose';
import { IEncryptedField,ISecureMediaStores } from './secure_media_stores.interface';

const EncryptedFieldSchema = new Schema<IEncryptedField>(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
  },
  { _id: false } 
);

const secureMediaStoresSchema = new Schema<ISecureMediaStores>(
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
      required:false
     
    },
    ephemPublicKey: {
      type: String,
      required: [true, 'ephemPublicKey is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index:true,
      ref: 'users',
    }
 
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

secureMediaStoresSchema.pre("find", function (next) {
  this.where({ isDelete: { $ne: true } });
  next();
});

secureMediaStoresSchema.pre("findOne", function (next) {
  this.where({ isDelete: { $ne: true } });
  next();
});

secureMediaStoresSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});


const securemediastores = model<ISecureMediaStores>('securemediastores', secureMediaStoresSchema);

export default securemediastores;
