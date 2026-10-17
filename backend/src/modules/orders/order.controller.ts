import type { Request, Response } from 'express';
import { currentUser } from '@middlewares/auth.middleware';
import { ApiResponse } from '@utils/ApiResponse';
import { orderService } from './order.service';
import {
  cancelSchema,
  cartSchema,
  idempotencyKeySchema,
  listOrdersQuery,
  orderIdParam,
  placeOrderSchema,
  restaurantOrdersQuery,
  reviewSchema,
  updateStatusSchema,
} from './order.validator';

export const orderController = {
  async quote(req: Request, res: Response) {
    ApiResponse.ok(res, await orderService.quote(cartSchema.parse(req.body)));
  },

  async place(req: Request, res: Response) {
    const key = idempotencyKeySchema.parse(req.get('idempotency-key'));
    const { order, replayed } = await orderService.place(currentUser(req), placeOrderSchema.parse(req.body), key);
    if (replayed) {
      res.setHeader('Idempotent-Replayed', 'true');
      ApiResponse.ok(res, order, 'Order already placed');
    } else {
      ApiResponse.created(res, order, 'Order placed');
    }
  },

  async listMine(req: Request, res: Response) {
    const { scope, ...page } = listOrdersQuery.parse(req.query);
    const result = await orderService.listMine(currentUser(req), scope, page);
    ApiResponse.ok(res, result.data, 'Orders', result.meta);
  },

  async listForRestaurant(req: Request, res: Response) {
    const { scope, restaurantId, ...page } = restaurantOrdersQuery.parse(req.query);
    const result = await orderService.listForRestaurant(currentUser(req), scope, page, restaurantId);
    ApiResponse.ok(res, result.data, 'Orders', result.meta);
  },

  async get(req: Request, res: Response) {
    const { id } = orderIdParam.parse(req.params);
    ApiResponse.ok(res, await orderService.get(currentUser(req), id));
  },

  async updateStatus(req: Request, res: Response) {
    const { id } = orderIdParam.parse(req.params);
    const { status } = updateStatusSchema.parse(req.body);
    ApiResponse.ok(res, await orderService.updateStatus(currentUser(req), id, status));
  },

  async cancel(req: Request, res: Response) {
    const { id } = orderIdParam.parse(req.params);
    const { reason } = cancelSchema.parse(req.body ?? {});
    ApiResponse.ok(res, await orderService.cancel(currentUser(req), id, reason), 'Order cancelled');
  },

  async available(_req: Request, res: Response) {
    ApiResponse.ok(res, await orderService.available());
  },

  async claim(req: Request, res: Response) {
    const { id } = orderIdParam.parse(req.params);
    ApiResponse.ok(res, await orderService.claim(currentUser(req), id), 'Order picked up');
  },

  async deliver(req: Request, res: Response) {
    const { id } = orderIdParam.parse(req.params);
    ApiResponse.ok(res, await orderService.deliver(currentUser(req), id), 'Order delivered');
  },

  async myDeliveries(req: Request, res: Response) {
    const { scope, ...page } = listOrdersQuery.parse(req.query);
    const result = await orderService.myDeliveries(currentUser(req), scope, page);
    ApiResponse.ok(res, result.data, 'Deliveries', result.meta);
  },

  async review(req: Request, res: Response) {
    const { id } = orderIdParam.parse(req.params);
    const { rating, comment } = reviewSchema.parse(req.body);
    ApiResponse.created(res, await orderService.review(currentUser(req), id, rating, comment), 'Thanks for your rating');
  },
};
