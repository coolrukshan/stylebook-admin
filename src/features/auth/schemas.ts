import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Enter your password"),
});

export const totpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const recoverySchema = z.object({
  code: z.string().trim().min(6, "Enter a recovery code").max(64),
});

export type LoginInput = z.infer<typeof loginSchema>;
