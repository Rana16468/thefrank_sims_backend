import status from "http-status";

import AppError from "../../errors/AppError";
import users from "../users/users.model";
import  crypto  from 'crypto';
import cryptoUtils from "../../utils/cryptoUtils/cryptoUtils";
import mongoose from "mongoose";
import securemediastores from "./secure_media_stores.model";
import { ISecureMediaStores } from "./secure_media_stores.interface";


const uploadContentSecureFolderIntoDb = async (
  userId: string,
  payload: Partial< ISecureMediaStores>
) => {
  try {

    // -----------------------
        // 1) Basic validations
        // -----------------------
        if (!userId) throw new AppError(status.UNAUTHORIZED, "User ID missing", "");
        // 2) Get receiver (must have publicKey)
    // -----------------------
    const receiver = await users
      .findById(userId)
      .select("publicKey");
     

    if (!receiver) throw new AppError(status.NOT_FOUND, "Receiver not found", "");
    if (!receiver.publicKey) throw new AppError(status.BAD_REQUEST, "Receiver public key missing", "");

    // -----------------------
        // 4) Encryption using receiver's publicKey (ECDH)
        // -----------------------
        const recipientPub = Buffer.from(receiver.publicKey, "base64");
        const ephem = crypto.createECDH("prime256v1");
        ephem.generateKeys();
        const sharedSecret = ephem.computeSecret(recipientPub);
    
   
      
    
    
        // Encrypt images (if exists)
        let imageUrlEncrypted: { ciphertext: string; iv: string; tag: string }[] = [];
        if (Array.isArray(payload.imageUrl) && payload.imageUrl.length > 0) {
          imageUrlEncrypted = payload.imageUrl.map((img:any) =>
            cryptoUtils.encryptMessage(sharedSecret, img)
          );
        }
    
       
    
        // Ensure at least one content exists
        if ( imageUrlEncrypted.length === 0) {
          throw new AppError(
            status.BAD_REQUEST,
            "Message must contain text, images, or audio",
            ""
          );
        }
    
        // -----------------------
        // 5) Persist message inside transaction
        // -----------------------
        const newMessage = await securemediastores.create(
          [
            {
              imageUrl: imageUrlEncrypted,
              ephemPublicKey: ephem.getPublicKey().toString("base64"),
              userId: new mongoose.Types.ObjectId(userId),
             
          
            },
          ]
          
        );

        if(!newMessage){
          throw new AppError(status.NOT_EXTENDED, 'some issues  by  the image url section into server ')
        }


   
    return{
      status: true ,
      message:"successfully upload"
    }
   
    
  

   
  } catch (error: any) {
    throw new AppError(
      error.statusCode || status.INTERNAL_SERVER_ERROR,
      error.message || "Failed to upload content to secure folder"
    );
  }
};


const SecureMediaStoresServices={
uploadContentSecureFolderIntoDb
};

export default SecureMediaStoresServices;

