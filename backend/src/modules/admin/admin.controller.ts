import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/ApiResponse';
import { SUCCESS_MESSAGES } from '@utils/constants';
import type { AdminService } from './admin.service';
import type { UpdateUserStatusDto, UpdateRestaurantStatusDto } from './admin.dto';

// ─── Admin Controller ─────────────────────────────────────────────────────────

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 10);
    const data = await this.adminService.getAll({ page, limit });
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data.data, data.meta);
  });

  getById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.adminService.getById(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data);
  });

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.adminService.create(req.body as UpdateUserStatusDto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.CREATED, data);
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.adminService.update(
      req.params['id'] as string,
      req.body as UpdateRestaurantStatusDto,
    );
    ApiResponse.ok(res, SUCCESS_MESSAGES.UPDATED, data);
  });

  remove = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.adminService.remove(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.DELETED, null);
  });
}
