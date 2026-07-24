// ─── Payment Types ────────────────────────────────────────────────────────────

export enum PaymentMethod {
  CARD = 'CARD',
  UPI = 'UPI',
  WALLET = 'WALLET',
  COD = 'COD',
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  method: PaymentMethod;
  amount: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
