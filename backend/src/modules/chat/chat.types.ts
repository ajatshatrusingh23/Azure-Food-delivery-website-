// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  orderId: string;
  participantIds: string[];
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
