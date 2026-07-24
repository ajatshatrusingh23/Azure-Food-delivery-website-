// ─── Menu Types ───────────────────────────────────────────────────────────────

export enum FoodCategory {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  VEGAN = 'VEGAN',
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: FoodCategory;
  restaurantId: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
