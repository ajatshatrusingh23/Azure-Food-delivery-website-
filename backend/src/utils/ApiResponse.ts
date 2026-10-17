import type { Response } from 'express';
import type { PaginationMeta } from '@shared/types';

/** Every successful response uses one envelope: { success, message, data, meta? }. */
export const ApiResponse = {
  ok<T>(res: Response, data: T, message = 'OK', meta?: PaginationMeta) {
    return res.status(200).json({ success: true, message, data, ...(meta && { meta }) });
  },
  created<T>(res: Response, data: T, message = 'Created') {
    return res.status(201).json({ success: true, message, data });
  },
  noContent(res: Response) {
    return res.status(204).send();
  },
};
