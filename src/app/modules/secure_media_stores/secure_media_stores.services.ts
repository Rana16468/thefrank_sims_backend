import status from "http-status";

import AppError from "../../errors/AppError";
import users from "../users/users.model";
import  crypto  from 'crypto';
import cryptoUtils from "../../utils/cryptoUtils/cryptoUtils";
import mongoose from "mongoose";
import securemediastores from "./secure_media_stores.model";
import { ISecureMediaStores } from "./secure_media_stores.interface";
import QueryBuilder from "../../builder/QueryBuilder";


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


const findByMySecureFolderMediaIntoDb = async (
  userId: string,
  query: Record<string, unknown>
) => {
  try {
    // 🔐 Fetch user private key
    const user = await users
      .findById(userId)
      .select("privateKey")
      .lean<{ privateKey: string }>();

    if (!user?.privateKey) {
      throw new Error("User private key not found");
    }

    // 🔑 Prepare ECDH once
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(user.privateKey, "base64"));

    // 📦 Query data (lean for performance)
    const qb = new QueryBuilder(
      securemediastores.find({ userId }).lean(),
      query
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const messages = await qb.modelQuery;
    const meta = await qb.countTotal();

    // 🔓 Decrypt helper
    const decryptPayload = (
      sharedSecret: Buffer,
      payload?: { ciphertext: string; iv: string; tag: string }
    ) => {
      if (!payload) return null;
      return cryptoUtils.decryptMessage(sharedSecret, payload);
    };

    // 🔄 Decrypt messages
    const decryptedMessages = messages.map((msg: any) => {
      if (!msg.ephemPublicKey) {
        return {
          ...msg,
          text: "[Missing ephem key]",
        };
      }

      try {
        const sharedSecret = ecdh.computeSecret(
          Buffer.from(msg.ephemPublicKey, "base64")
        );

        return {
          _id: msg._id,
          userId: msg.userId,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,

          text: msg.text
            ? decryptPayload(sharedSecret, msg.text)
            : "",

          imageUrl: Array.isArray(msg.imageUrl)
            ? msg.imageUrl.map((img: any) =>
                decryptPayload(sharedSecret, img)
              )
            : [],

          audioUrl: decryptPayload(sharedSecret, msg.audioUrl),
        };
      } catch (err) {
        console.error("Decryption failed for message:", msg._id, err);
        return {
          _id: msg._id,
          error: "Unable to decrypt",
        };
      }
    });

    return {
      meta,
      allmessage: decryptedMessages,
    };
  } catch (error: any) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "Find secure folder data unavailable",
      error
    );
  }
};



const SecureMediaStoresServices={
uploadContentSecureFolderIntoDb,
 findByMySecureFolderMediaIntoDb 
};

export default SecureMediaStoresServices;

