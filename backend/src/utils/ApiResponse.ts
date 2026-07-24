import { Response } from 'express';
import type { PaginationMeta, ApiSuccessResponse } from '@types/common.types';

/**
 * Centralised response formatter.
 * All successful responses must go through this helper to ensure
 * a consistent JSON envelope across the entire API.
 */
export class ApiResponse {
  static success<T>(
    res: Response,
    statusCode: number,
    message: string,
    data: T,
    meta?: PaginationMeta,
  ): Response {
    const body: ApiSuccessResponse<T> = {
      success: true,
      statusCode,
      message,
      data,
      ...(meta && { meta }),
    };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, message: string, data: T): Response {
    return ApiResponse.success(res, 201, message, data);
  }

  static ok<T>(res: Response, message: string, data: T, meta?: PaginationMeta): Response {
    return ApiResponse.success(res, 200, message, data, meta);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
