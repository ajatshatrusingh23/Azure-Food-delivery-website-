import { z } from 'zod';

// ─── Create Review ────────────────────────────────────────────────────────────

export const CreateReviewSchema = z.object({
  restaurantId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

// ─── Update Review ────────────────────────────────────────────────────────────

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
