import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/ApiResponse';
import { SUCCESS_MESSAGES } from '@utils/constants';
import type { RestaurantService } from './restaurant.service';
import type { CreateRestaurantDto, UpdateRestaurantDto } from './restaurant.dto';

// ─── Restaurant Controller ────────────────────────────────────────────────────

export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 10);
    const data = await this.restaurantService.getAll({ page, limit });
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data.data, data.meta);
  });

  getById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.restaurantService.getById(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data);
  });

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.restaurantService.create(req.body as CreateRestaurantDto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.CREATED, data);
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.restaurantService.update(
      req.params['id'] as string,
      req.body as UpdateRestaurantDto,
    );
    ApiResponse.ok(res, SUCCESS_MESSAGES.UPDATED, data);
  });

  remove = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.restaurantService.remove(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.DELETED, null);
  });
}
