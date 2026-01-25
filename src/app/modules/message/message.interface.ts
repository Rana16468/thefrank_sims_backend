import { Types } from 'mongoose';
import { Request } from 'express';

// 🔒 Interface for encrypted fields (text, image, audio)
export interface IEncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
}

// 🔹 Message interface
export interface IMessage {
  text?: IEncryptedField;          // encrypted text
  imageUrl: IEncryptedField[];     // array of encrypted images
  audioUrl?: IEncryptedField;      // optional encrypted audio
  seen: boolean; 
  ciphertext: string,
   iv: string,
    tag: string,
     ephemPublicKey: string,
      msgByUserId: Types.ObjectId;
       conversationId: Types.ObjectId;
       receiverId: Types.ObjectId
}

// 🔹 Payload for creating a new message
export interface NewMessagePayload {
  receiverId: string;
  currentSubId: string;
  text: string;
  imageUrl?: string[];           // plain URLs to be encrypted before saving
  audioUrl?: string;             // plain audio URL to be encrypted
  chat?: "singlechat" | "groupchat";
}

// 🔹 Multer request for file uploads
export interface MulterRequest extends Request {
  files?: Express.Multer.File[]; // for multiple files via `.array()` or `.fields()`
  file?: Express.Multer.File;    // for single file via `.single()`
}
