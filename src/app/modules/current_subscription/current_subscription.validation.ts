import { z } from "zod";

const currentSubscriptionSchema = z.object({
  body: z.object({
    subscriptionId: z.string({
     error: "subscriptionId is required",
    }).optional(),
    subscriptionPriceId: z.string({
      error: "subscriptionPriceId is required",
    }).optional(),
    typesubscription:  z.enum(["free", "paid"], {
      error: "typesubscription is required",
    }),
  }),
});


const updateStatusSchema=z.object({
  body:z.object({
    isActive: z.boolean({error:"is active is required"})
  })
    
  
});

const CurrentSubscriptionValidation= {
    currentSubscriptionSchema,
    updateStatusSchema
};

export default CurrentSubscriptionValidation;


