
import {z} from 'zod';

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


const SecureMediaStoresValidation={
secureFolderMediaFileSchema
};

export default SecureMediaStoresValidation