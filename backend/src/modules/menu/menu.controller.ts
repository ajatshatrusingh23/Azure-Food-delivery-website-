import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/ApiResponse';
import { SUCCESS_MESSAGES } from '@utils/constants';
import type { MenuService } from './menu.service';
import type { CreateMenuItemDto, UpdateMenuItemDto } from './menu.dto';

// ─── Menu Controller ──────────────────────────────────────────────────────────

export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 10);
    const data = await this.menuService.getAll({ page, limit });
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data.data, data.meta);
  });

  getById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.menuService.getById(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data);
  });

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.menuService.create(req.body as CreateMenuItemDto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.CREATED, data);
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.menuService.update(
      req.params['id'] as string,
      req.body as UpdateMenuItemDto,
    );
    ApiResponse.ok(res, SUCCESS_MESSAGES.UPDATED, data);
  });

  remove = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.menuService.remove(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.DELETED, null);
  });
}
