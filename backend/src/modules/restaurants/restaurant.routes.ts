import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { restaurantController as c } from './restaurant.controller';

export const restaurantRouter = Router();

/** Public route that still recognises a logged-in owner/admin (to preview unlisted restaurants). */
const optionalAuth = (req: Request, res: Response, next: NextFunction) =>
  req.cookies?.access_token || req.headers.authorization ? authenticate(req, res, () => next()) : next();

const owner = [authenticate, authorize('RESTAURANT_OWNER', 'ADMIN')];

// Public
restaurantRouter.get('/', c.list);
restaurantRouter.get('/facets', c.facets);

// Owner (registered before /:ref so "mine" isn't read as a slug)
restaurantRouter.get('/mine', ...owner, c.mine);
restaurantRouter.post('/', authenticate, authorize('RESTAURANT_OWNER'), c.create);
restaurantRouter.patch('/:id', ...owner, c.update);
restaurantRouter.patch('/:id/open', ...owner, c.setOpen);
restaurantRouter.post('/:id/menu-items', ...owner, c.addMenuItem);
restaurantRouter.patch('/:id/menu-items/:itemId', ...owner, c.updateMenuItem);
restaurantRouter.delete('/:id/menu-items/:itemId', ...owner, c.archiveMenuItem);

// Public (parameterised last)
restaurantRouter.get('/:id/reviews', c.reviews);
restaurantRouter.get('/:ref', optionalAuth, c.detail);
