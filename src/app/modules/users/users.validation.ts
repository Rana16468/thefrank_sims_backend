import { z } from "zod";
import { USER_ACCESSIBILITY, USER_ROLE } from "./user.constant";

// Common password regex (min 6 chars, at least 1 number & 1 letter)
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;

const createUserZodSchema = z.object({
  body: z.object({
    name: z.string({
      error: "User name is required",
    }),

    password: z
      .string({
        error: "Password is required",
      }).regex(passwordRegex, {
        message:
          "Password must be at least 6 characters long, contain at least one letter and one number",
      }).optional(),

    email: z
      .string({
        error: "Email is required",
      })
      .email("Invalid email format"),

    phoneNumber: z
      .string()
      .optional()
      .refine((val) => !val || /^[0-9]{10,15}$/.test(val), {
        message:
          "Phone number must be digits only and between 10–15 characters",
      }),

    dateOfBirth: z
      .string({
        error: "Date of birth is required",
      })
      .optional(),

    verificationCode: z.number().optional(),

    isVerify: z.boolean().default(false),

    role: z
      .enum([
        USER_ROLE.admin,
        USER_ROLE.user,
        USER_ROLE.superAdmin,
  
      ])
      .default(USER_ROLE.user),

    status: z
      .enum([USER_ACCESSIBILITY.isProgress, USER_ACCESSIBILITY.blocked])
      .default(USER_ACCESSIBILITY.isProgress),

    photo: z.string().nullable().optional(),

    stripeAccountId: z.string().optional(),

    isStripeConnected: z.boolean().default(false),

    address: z.string().optional(),

    fcm: z.string().nullable().optional(),

    isDelete: z.boolean().default(false),
  }),
});

const UserVerification = z.object({
  body: z.object({
    verificationCode: z
      .number({ error: "varification code is required" })
      .min(6, { message: "min 6 character accepted" }),
  }),
});

const ChnagePasswordSchema = z.object({
  body: z.object({
    newpassword: z
      .string({ error: "new password is required" })
      .min(6, { message: "min 6 character accepted" }),
    oldpassword: z
      .string({ error: "old password is  required" })
      .min(6, { message: "min 6 character accepted" }),
  }),
});

const UpdateUserProfileSchema = z.object({
  body: z.object({
    name: z
      .string({ error: "user name is required" })
      .min(3, { message: "min 3 character accepted" })
      .max(15, { message: "max 15 character accepted" })
      .optional(),

    phoneNumber: z.string({ error: "phoene number is option" }).optional(),
    address: z.string({ error: "address is not required" }).optional(),
    photo: z.string({ error: "optional photot" }).url().optional(),
    dateOfBirth: z
      .string({
        error: "Date of birth is required",
      })
      .optional(),
  }),
});

const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ error: "Email is Required" })
      .email("Invalid email format")
      .refine(
        (email) => {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        {
          message: "Invalid email format",
        }
      ),
  }),
});

const verificationCodeSchema = z.object({
  body: z.object({
    verificationCode: z
      .number({ error: " verificationCode is require" })
      .min(6, { message: "min 5  number accepted" }),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    userId: z.string({ error: "userId is require" }),
    password: z.string({ error: "password is require" }),
  }),
});

const UserValidationSchema = {
  createUserZodSchema,
  UserVerification,
  ChnagePasswordSchema,
  UpdateUserProfileSchema,
  ForgotPasswordSchema,
  verificationCodeSchema,
  resetPasswordSchema,
};

export default UserValidationSchema;
