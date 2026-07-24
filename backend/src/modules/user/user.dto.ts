import { z } from 'zod';

// ─── Update User ──────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  avatar: z.string().url().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

// ─── Change Password ──────────────────────────────────────────────────────────

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
