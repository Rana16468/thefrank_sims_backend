import { z } from "zod";

const createSubscriptionValidation = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),

    subscriptionType30: z.object({
      title: z.string(),
      features: z.array(z.string()),
    }),

    subscriptionType15: z.object({
      title: z.string(),
      features: z.array(z.string()),
    }),

    subscriptionPrice: z.array(
      z.object({
        pricetype: z.string().min(1, "Price type required"),
      })
    ).min(1),

    isDelete: z.boolean().optional(),
  }),
});


const updateSubscriptionValidation = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),

    subscriptionType30: z.object({
      title: z.string().optional(),
      features: z.array(z.string()).optional(),
    }).optional(),

    subscriptionType15: z.object({
      title: z.string().optional(),
      features: z.array(z.string()).optional(),
    }).optional(),

    subscriptionPrice: z.array(
      z.object({
        pricetype: z.string().optional(),
      })
    ).optional(),

    isDelete: z.boolean().optional(),
  }),
});


const subscriptionValidation = {
  createSubscriptionValidation,
  updateSubscriptionValidation,
};

export default subscriptionValidation;
