import { ApiError } from '@utils/ApiError';
import { paginate, type PaginationInput } from '@utils/pagination';
import { slugify } from '@utils/slug';
import type { AuthUser } from '@shared/types';
import { restaurantRepository } from './restaurant.repository';
import type {
  CreateMenuItemInput,
  CreateRestaurantInput,
  ListRestaurantsQuery,
  UpdateMenuItemInput,
  UpdateRestaurantInput,
} from './restaurant.validator';

/** Owners manage only their own restaurants; admins can manage any. */
const assertCanManage = async (restaurantId: string, user: AuthUser) => {
  const restaurant = await restaurantRepository.findById(restaurantId);
  if (!restaurant) throw ApiError.notFound('Restaurant');
  if (user.role !== 'ADMIN' && restaurant.ownerId !== user.id) {
    throw ApiError.forbidden('You can only manage your own restaurants');
  }
  return restaurant;
};

export const restaurantService = {
  async list(query: ListRestaurantsQuery) {
    const { rows, total } = await restaurantRepository.listActive(query);
    return paginate(rows, total, query);
  },

  /** Public detail page with the menu grouped by category. */
  async detail(ref: string, viewer?: AuthUser) {
    const restaurant = await restaurantRepository.findByRef(ref);
    const canSeeUnlisted = viewer && (viewer.role === 'ADMIN' || viewer.id === restaurant?.ownerId);
    if (!restaurant || (restaurant.status !== 'ACTIVE' && !canSeeUnlisted)) throw ApiError.notFound('Restaurant');

    const { menuItems, ownerId: _ownerId, ...info } = restaurant;
    const categories = new Map<string, typeof menuItems>();
    for (const item of menuItems) categories.set(item.category, [...(categories.get(item.category) ?? []), item]);
    // Recommended (bestsellers) first, like the apps people are used to.
    const bestsellers = menuItems.filter((i) => i.isBestseller && i.isAvailable);
    return {
      ...info,
      menu: [
        ...(bestsellers.length ? [{ category: 'Recommended', items: bestsellers }] : []),
        ...[...categories].map(([category, items]) => ({ category, items })),
      ],
    };
  },

  facets: () => restaurantRepository.facets(),

  async reviews(restaurantId: string, page: PaginationInput) {
    const { rows, total } = await restaurantRepository.listReviews(restaurantId, page);
    return paginate(rows, total, page);
  },

  // ── Owner ─────────────────────────────────────────────────────────────────
  mine: (ownerId: string) => restaurantRepository.listByOwner(ownerId),

  /** New restaurants start as PENDING and appear publicly only after an admin approves them. */
  create(owner: AuthUser, input: CreateRestaurantInput) {
    return restaurantRepository.create({
      ...input,
      ownerId: owner.id,
      slug: slugify(`${input.name} ${input.area}`),
      status: 'PENDING',
      imageHue: Math.floor(Math.random() * 360),
    });
  },

  async update(user: AuthUser, restaurantId: string, input: UpdateRestaurantInput) {
    await assertCanManage(restaurantId, user);
    return restaurantRepository.update(restaurantId, input);
  },

  async setOpen(user: AuthUser, restaurantId: string, isOpen: boolean) {
    await assertCanManage(restaurantId, user);
    return restaurantRepository.update(restaurantId, { isOpen });
  },

  // ── Menu ──────────────────────────────────────────────────────────────────
  async addMenuItem(user: AuthUser, restaurantId: string, input: CreateMenuItemInput) {
    await assertCanManage(restaurantId, user);
    return restaurantRepository.createMenuItem({ ...input, restaurantId });
  },

  async updateMenuItem(user: AuthUser, restaurantId: string, itemId: string, input: UpdateMenuItemInput) {
    await assertCanManage(restaurantId, user);
    if (!(await restaurantRepository.findMenuItem(restaurantId, itemId))) throw ApiError.notFound('Menu item');
    return restaurantRepository.updateMenuItem(itemId, input);
  },

  /** Soft delete: past orders keep pointing at the item, but it disappears from the menu. */
  async archiveMenuItem(user: AuthUser, restaurantId: string, itemId: string) {
    await assertCanManage(restaurantId, user);
    if (!(await restaurantRepository.findMenuItem(restaurantId, itemId))) throw ApiError.notFound('Menu item');
    await restaurantRepository.updateMenuItem(itemId, { isArchived: true, isAvailable: false });
  },
};
