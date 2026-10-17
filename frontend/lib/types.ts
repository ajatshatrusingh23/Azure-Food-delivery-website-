export type Role = 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DELIVERY_PARTNER' | 'ADMIN';
export type FoodType = 'VEG' | 'NON_VEG' | 'EGG';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface RestaurantCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisines: string[];
  area: string;
  city: string;
  priceForTwo: number;
  avgDeliveryMins: number;
  isOpen: boolean;
  isPureVeg: boolean;
  ratingAvg: number;
  ratingCount: number;
  imageHue: number;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  foodType: FoodType;
  isAvailable: boolean;
  isBestseller: boolean;
}

export interface RestaurantDetail extends RestaurantCard {
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  menu: { category: string; items: MenuItem[] }[];
}

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: 'ONLINE' | 'COD';
  paymentStatus: PaymentStatus;
  itemsTotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  notes: string | null;
  cancelReason: string | null;
  placedAt: string;
  deliveredAt: string | null;
  items: { id: string; menuItemId: string; name: string; price: number; quantity: number }[];
  events: OrderEvent[];
  restaurant: { id: string; name: string; slug: string; area: string; address: string; phone: string; latitude: number; longitude: number; imageHue: number };
  customer: { id: string; name: string; phone: string | null };
  deliveryPartner: { id: string; name: string; phone: string | null } | null;
  payment: { status: PaymentStatus; provider: string; providerOrderId: string; amount: number } | null;
  review: { rating: number; comment: string | null } | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: 'ONLINE' | 'COD';
  paymentStatus: PaymentStatus;
  total: number;
  placedAt: string;
  deliveredAt: string | null;
  deliveryAddress: string;
  notes?: string | null;
  restaurant: { id: string; name: string; slug: string; area: string; imageHue: number; address?: string; latitude?: number; longitude?: number };
  items: { name: string; quantity: number }[];
  review: { rating: number } | null;
  customer?: { name: string; phone?: string | null };
  deliveryPartner?: { name: string } | null;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}
