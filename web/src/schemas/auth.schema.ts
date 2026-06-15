import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Your full name is required'),
    email: z.string().email('Enter a valid email'),
    company: z.string().optional(),
    phone: z.string().optional(),
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
