import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('A valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['manager', 'attendant']).default('attendant'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username/Email or Phone is required'),
  password: z.string().min(1, 'Password is required'),
  loginMethod: z.enum(['username', 'phone']).default('username'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('A valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

