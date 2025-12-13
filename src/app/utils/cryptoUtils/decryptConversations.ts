// import crypto from "crypto";
// import cryptoUtils from "./cryptoUtils";

// const decryptConversations = (allConversations: any[]) => {
//   const decryptedConversations: any[] = [];

//   for (const conversation of allConversations) {
//     const conv = conversation._doc || conversation;
//     const participant = conv.participants?.[0];
//     const lastMessage = conv.lastMessage?._doc || conv.lastMessage;

//     if (!participant || !lastMessage || !lastMessage.text) {
//       decryptedConversations.push({
//         ...conv,
//         lastMessage: { text: "[No message or participant]" },
//       });
//       continue;
//     }

//     const privateKey = participant.privateKey;
//     const { ciphertext, iv, tag } = lastMessage.text;
//     const ephemPublicKey = lastMessage.ephemPublicKey;

//     try {
//       // Step 1: compute shared secret using ECDH
//       const ecdh = crypto.createECDH("prime256v1");
//       ecdh.setPrivateKey(Buffer.from(privateKey, "base64"));
//       const sharedSecret = ecdh.computeSecret(Buffer.from(ephemPublicKey, "base64"));

//       // Step 2: decrypt message using cryptoUtils
//       const decryptedText = cryptoUtils.decryptMessage(sharedSecret, {
//         ciphertext: ciphertext,
//         iv: Buffer.from(iv, "utf8"), // IV is UTF-8
//         tag: Buffer.from(tag, "base64"),
//       });

//       decryptedConversations.push({
//         ...conv,
//         lastMessage: { ...lastMessage, text: decryptedText },
//       });
//     } catch (err) {
//       console.error("Decryption failed:", err.message);
//       decryptedConversations.push({
//         ...conv,
//         lastMessage: { ...lastMessage, text: "[Decryption failed]" },
//       });
//     }
//   }

//   console.log(decryptedConversations)

//   return decryptedConversations;
// };

// export default decryptConversations;
