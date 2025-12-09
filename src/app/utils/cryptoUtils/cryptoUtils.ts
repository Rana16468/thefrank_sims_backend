import crypto from "crypto";

type EncryptedMessage = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const cryptoUtils = {
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const ecdh = crypto.createECDH("prime256v1"); 
    ecdh.generateKeys();
    return {
      publicKey: ecdh.getPublicKey().toString("base64"),
      privateKey: ecdh.getPrivateKey().toString("base64"),
    };
  },

  deriveSymmetricKey(sharedSecret: Buffer):any {
    const salt = Buffer.alloc(0); 
    return crypto.hkdfSync("sha256", sharedSecret, salt, Buffer.from("msg"), 32);
  },

  encryptMessage(sharedSecret: Buffer, plaintext: string): EncryptedMessage {
    const key = this.deriveSymmetricKey(sharedSecret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { 
      ciphertext: ciphertext.toString("base64"), 
      iv: iv.toString("base64"), 
      tag: tag.toString("base64") 
    };
  },

  decryptMessage(sharedSecret: Buffer, encrypted: EncryptedMessage): string {
    const key = this.deriveSymmetricKey(sharedSecret);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")), 
      decipher.final()
    ]).toString("utf8");
  },
};

export default cryptoUtils;
