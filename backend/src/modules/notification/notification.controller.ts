import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/ApiResponse';
import { SUCCESS_MESSAGES } from '@utils/constants';
import type { NotificationService } from './notification.service';
import type { CreateNotificationDto, MarkReadDto } from './notification.dto';

// ─── Notification Controller ──────────────────────────────────────────────────

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 10);
    const data = await this.notificationService.getAll({ page, limit });
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data.data, data.meta);
  });

  getById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.notificationService.getById(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data);
  });

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.notificationService.create(req.body as CreateNotificationDto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.CREATED, data);
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.notificationService.update(
      req.params['id'] as string,
      req.body as MarkReadDto,
    );
    ApiResponse.ok(res, SUCCESS_MESSAGES.UPDATED, data);
  });

  remove = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.notificationService.remove(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.DELETED, null);
  });
}
