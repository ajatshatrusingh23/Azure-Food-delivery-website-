import { z } from 'zod';

// ─── Send Message ─────────────────────────────────────────────────────────────

export const SendMessageSchema = z.object({
  chatId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

export type SendMessageDto = z.infer<typeof SendMessageSchema>;

// ─── Create Chat ──────────────────────────────────────────────────────────────

export const CreateChatSchema = z.object({
  orderId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(2),
});

export type CreateChatDto = z.infer<typeof CreateChatSchema>;
