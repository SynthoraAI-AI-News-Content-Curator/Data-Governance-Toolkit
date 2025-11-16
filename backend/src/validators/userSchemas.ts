import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    newsletter: z.boolean().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
});
