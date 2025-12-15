import { Model, Types } from "mongoose";


export interface TSecureFolder {
  userId: Types.ObjectId;
  password: string;
  folder?: "SecureFolder";
  isDelete: boolean;
}

export interface SecureFolderMethods {
  isPasswordMatched(
    plainTextPassword: string
  ): Promise<boolean>;
}

export interface SecureFolderModel
  extends Model<TSecureFolder, {}, SecureFolderMethods> {
  isSecureFolderCustomId(
    id: string
  ): Promise<TSecureFolder | null>;
}
