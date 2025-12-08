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

const CurrentSubscriptionValidation= {
    currentSubscriptionSchema
};

export default CurrentSubscriptionValidation;


