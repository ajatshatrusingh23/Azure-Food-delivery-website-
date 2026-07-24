// ─── Review Types ─────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  restaurantId: string;
  customerId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}
