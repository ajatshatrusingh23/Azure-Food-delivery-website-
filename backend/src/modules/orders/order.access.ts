import type { AuthUser } from '@shared/types';
import type { OrderActor } from './order.state';

export interface OrderParties {
  customerId: string;
  deliveryPartnerId: string | null;
  restaurant: { ownerId: string };
}

/**
 * How the caller relates to an order, or null if they have no business seeing it.
 * Used by the REST API and by the socket server (subscribing to live tracking).
 */
export const actorFor = (user: Pick<AuthUser, 'id' | 'role'>, order: OrderParties): OrderActor | null => {
  if (user.role === 'ADMIN') return 'ADMIN';
  if (user.role === 'CUSTOMER' && order.customerId === user.id) return 'CUSTOMER';
  if (user.role === 'RESTAURANT_OWNER' && order.restaurant.ownerId === user.id) return 'RESTAURANT';
  if (user.role === 'DELIVERY_PARTNER' && order.deliveryPartnerId === user.id) return 'RIDER';
  return null;
};
