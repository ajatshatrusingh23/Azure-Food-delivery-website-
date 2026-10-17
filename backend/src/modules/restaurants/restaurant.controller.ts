import type { Request, Response } from 'express';
import { currentUser } from '@middlewares/auth.middleware';
import { ApiResponse } from '@utils/ApiResponse';
import { paginationSchema } from '@utils/pagination';
import { restaurantService } from './restaurant.service';
import {
  createMenuItemSchema,
  createRestaurantSchema,
  listRestaurantsQuery,
  menuItemParams,
  restaurantIdParam,
  restaurantRefParam,
  setOpenSchema,
  updateMenuItemSchema,
  updateRestaurantSchema,
} from './restaurant.validator';

export const restaurantController = {
  async list(req: Request, res: Response) {
    const result = await restaurantService.list(listRestaurantsQuery.parse(req.query));
    ApiResponse.ok(res, result.data, 'Restaurants', result.meta);
  },

  async facets(_req: Request, res: Response) {
    ApiResponse.ok(res, await restaurantService.facets());
  },

  async detail(req: Request, res: Response) {
    const { ref } = restaurantRefParam.parse(req.params);
    ApiResponse.ok(res, await restaurantService.detail(ref, req.user));
  },

  async reviews(req: Request, res: Response) {
    const { id } = restaurantIdParam.parse(req.params);
    const result = await restaurantService.reviews(id, paginationSchema.parse(req.query));
    ApiResponse.ok(res, result.data, 'Reviews', result.meta);
  },

  async mine(req: Request, res: Response) {
    ApiResponse.ok(res, await restaurantService.mine(currentUser(req).id));
  },

  async create(req: Request, res: Response) {
    const restaurant = await restaurantService.create(currentUser(req), createRestaurantSchema.parse(req.body));
    ApiResponse.created(res, restaurant, 'Restaurant submitted for approval');
  },

  async update(req: Request, res: Response) {
    const { id } = restaurantIdParam.parse(req.params);
    ApiResponse.ok(res, await restaurantService.update(currentUser(req), id, updateRestaurantSchema.parse(req.body)));
  },

  async setOpen(req: Request, res: Response) {
    const { id } = restaurantIdParam.parse(req.params);
    const { isOpen } = setOpenSchema.parse(req.body);
    ApiResponse.ok(res, await restaurantService.setOpen(currentUser(req), id, isOpen));
  },

  async addMenuItem(req: Request, res: Response) {
    const { id } = restaurantIdParam.parse(req.params);
    const item = await restaurantService.addMenuItem(currentUser(req), id, createMenuItemSchema.parse(req.body));
    ApiResponse.created(res, item, 'Menu item added');
  },

  async updateMenuItem(req: Request, res: Response) {
    const { id, itemId } = menuItemParams.parse(req.params);
    ApiResponse.ok(res, await restaurantService.updateMenuItem(currentUser(req), id, itemId, updateMenuItemSchema.parse(req.body)));
  },

  async archiveMenuItem(req: Request, res: Response) {
    const { id, itemId } = menuItemParams.parse(req.params);
    await restaurantService.archiveMenuItem(currentUser(req), id, itemId);
    ApiResponse.noContent(res);
  },
};
