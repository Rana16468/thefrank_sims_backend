import { z } from "zod";

const AboutValidationSchema = z.object({
  body: z.object({
    aboutUs: z.string({ message: "about us is required" }),
  }),
});

const PrivacyPolicysValidationSchema = z.object({
  body: z.object({
    PrivacyPolicy: z.string({ message: "  PrivacyPolicy us is required" }),
  }),
});

//   TermsConditions:

const TermsConditionsValidationSchema = z.object({
  body: z.object({
    TermsConditions: z.string({ message: "  TermsConditions us is required" }),
  }),
});

const settingValidationSchema = {
  AboutValidationSchema,
  PrivacyPolicysValidationSchema,
  TermsConditionsValidationSchema,
};

export default settingValidationSchema;
