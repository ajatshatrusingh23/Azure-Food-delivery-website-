// ─── Restaurant Types ─────────────────────────────────────────────────────────

export enum RestaurantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum CuisineType {
  INDIAN = 'INDIAN',
  CHINESE = 'CHINESE',
  ITALIAN = 'ITALIAN',
  MEXICAN = 'MEXICAN',
  AMERICAN = 'AMERICAN',
  CONTINENTAL = 'CONTINENTAL',
  OTHER = 'OTHER',
}

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  cuisineType: CuisineType;
  phone: string;
  email: string;
  status: RestaurantStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
