import crypto from "crypto";
import cryptoUtils from "./cryptoUtils";

export const decryptedUtils = (
  allMessages: any[],
  userPrivateKeyList: { privateKey?: string }[]
) => {
  if (!allMessages?.length) return [];

  // 🔹 Build private key list ONCE
  const privateKeys = userPrivateKeyList
    .map(u => u.privateKey)
    .filter(Boolean) as string[];

  return allMessages.map((msg: any) => {
    if (!msg.ephemPublicKey) {
      return { ...msg, text: "[Missing ephem key]" };
    }

    const ephemKeyBuffer = Buffer.from(msg.ephemPublicKey, "base64");

    let decryptedText = "[Unable to decrypt]";
    let decryptedImages: string[] = [];
    let decryptedAudio: string | null = null;

    for (const privateKey of privateKeys) {
      try {
        const ecdh = crypto.createECDH("prime256v1");
        ecdh.setPrivateKey(Buffer.from(privateKey, "base64"));

        const sharedSecret = ecdh.computeSecret(ephemKeyBuffer);

        // decrypt text first
        decryptedText = msg.text
          ? cryptoUtils.decryptMessage(sharedSecret, msg.text)
          : "";

        // only decrypt media if text succeeded
        decryptedImages = Array.isArray(msg.imageUrl)
          ? msg.imageUrl.map((img: string) =>
              cryptoUtils.decryptMessage(sharedSecret, img as any)
            )
          : [];

        decryptedAudio = msg.audioUrl
          ? cryptoUtils.decryptMessage(sharedSecret, msg.audioUrl)
          : null;

        break;
      } catch {
        continue;
      }
    }

    return {
      ...msg,
      text: decryptedText,
      imageUrl: decryptedImages,
      audioUrl: decryptedAudio,
    };
  });
};
