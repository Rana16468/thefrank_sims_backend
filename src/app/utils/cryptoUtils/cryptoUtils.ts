import crypto from "crypto";

export type EncryptedMessage = {
  ciphertext: string; // base64
  iv: string;         // base64, 12 bytes
  tag: string;        // base64, 16 bytes
};

const cryptoUtils = {
  /**
   * Generate a new ECDH key pair (prime256v1)
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.generateKeys();
    return {
      publicKey: ecdh.getPublicKey().toString("base64"),
      privateKey: ecdh.getPrivateKey().toString("base64"),
    };
  },

  /**
   * Derive a 256-bit symmetric key from ECDH shared secret using HKDF
   */
  deriveSymmetricKey(sharedSecret: Buffer): any {
    const salt = Buffer.alloc(0); // optional, empty salt
    return crypto.hkdfSync("sha256", sharedSecret, salt, Buffer.from("msg"), 32); // 32 bytes = 256 bits
  },

  /**
   * Encrypt plaintext using shared secret
   */
  encryptMessage(sharedSecret: Buffer, plaintext: string): EncryptedMessage {
    const key = this.deriveSymmetricKey(sharedSecret); // 256-bit key
    const iv = crypto.randomBytes(12);                 // 12-byte IV for AES-GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  },

  /**
   * Decrypt a message using shared secret
   */
  decryptMessage(sharedSecret: Buffer, encrypted: EncryptedMessage): string {
    const key = this.deriveSymmetricKey(sharedSecret);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(encrypted.iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  },
};

export default cryptoUtils;
