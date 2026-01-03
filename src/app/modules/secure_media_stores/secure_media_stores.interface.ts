import { Types } from 'mongoose';
import { Request } from 'express';

// 🔒 Interface for encrypted fields (text, image, audio)
export interface IEncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface ISecureMediaStores {
  text?: IEncryptedField;         
  imageUrl: IEncryptedField[];     
  audioUrl?: IEncryptedField;      
  ciphertext: string,
   iv: string,
    tag: string,
     ephemPublicKey: string,
      userId: Types.ObjectId;
      
}

export interface MulterRequest extends Request {
  files?: Express.Multer.File[]; 
  file?: Express.Multer.File;   
}
