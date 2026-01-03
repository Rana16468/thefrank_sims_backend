import { z } from 'zod';
import { CHAT_TYPE } from '../conversation/conversation.constant';


const messageSchema = z.object({
  body: z.object({
    conversationId:z.string({error:"conversationId is required"}),
    text: z.string().trim().optional(),
    imageUrl: z.array(z.string()).optional(),
    currentSubId: z.string().optional(),
    audioUrl: z.string().optional(),
    receiverId: z.string({ error: "receiverId is required" }),
    chat: z.enum([CHAT_TYPE.singlechat, CHAT_TYPE.groupchat])
    
    
  })
  .superRefine((data, ctx) => {
    if (
      !data.text?.trim() &&
      (!data.imageUrl || data.imageUrl.length === 0) &&
      !data.audioUrl?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Either text, imageUrl, or audioUrl is required",
        path: ["text"],
      });
    }
  })
  .strict()
});


const messageUpdateSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required').optional(),
  }),
});

const secureFolderMediaFileSchema = z.object({
  body: z.object({
   
    text: z.string().trim().optional(),
    imageUrl: z.array(z.string()).optional(),
    audioUrl: z.string().optional()
   
  
  })
  .superRefine((data, ctx) => {
    if (
      !data.text?.trim() &&
      (!data.imageUrl || data.imageUrl.length === 0) &&
      !data.audioUrl?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Either text, imageUrl, or audioUrl is required",
        path: ["text"],
      });
    }
  })
  .strict()
});

const MessageValidationSchema = {
  messageSchema,
  messageUpdateSchema,
   secureFolderMediaFileSchema 
};

export default MessageValidationSchema;