import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/ApiResponse';
import { SUCCESS_MESSAGES } from '@utils/constants';
import type { ReviewService } from './review.service';
import type { CreateReviewDto, UpdateReviewDto } from './review.dto';

// ─── Review Controller ────────────────────────────────────────────────────────

export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  getAll = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query['page'] ?? 1);
    const limit = Number(req.query['limit'] ?? 10);
    const data = await this.reviewService.getAll({ page, limit });
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data.data, data.meta);
  });

  getById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.reviewService.getById(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.FETCHED, data);
  });

  create = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.reviewService.create(req.body as CreateReviewDto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.CREATED, data);
  });

  update = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const data = await this.reviewService.update(
      req.params['id'] as string,
      req.body as UpdateReviewDto,
    );
    ApiResponse.ok(res, SUCCESS_MESSAGES.UPDATED, data);
  });

  remove = catchAsync(async (req: Request, res: Response): Promise<void> => {
    await this.reviewService.remove(req.params['id'] as string);
    ApiResponse.ok(res, SUCCESS_MESSAGES.DELETED, null);
  });
}
