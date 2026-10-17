import { Router } from 'express';
import { z } from 'zod';
import { ApiResponse } from '@utils/ApiResponse';
import { searchService } from './search.service';

const searchQuery = z.object({
  q: z.string().trim().min(1, 'Type something to search').max(100),
  city: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

export const searchRouter = Router();

searchRouter.get('/', async (req, res) => {
  const { q, city, limit } = searchQuery.parse(req.query);
  ApiResponse.ok(res, await searchService.search(q, { city, limit }));
});

searchRouter.get('/suggest', async (req, res) => {
  const { q, city } = searchQuery.parse(req.query);
  ApiResponse.ok(res, await searchService.suggest(q, city));
});
