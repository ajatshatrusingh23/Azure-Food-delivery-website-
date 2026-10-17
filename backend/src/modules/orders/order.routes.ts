import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { orderController as c } from './order.controller';

export const orderRouter = Router();
orderRouter.use(authenticate);

const customer = authorize('CUSTOMER');
const owner = authorize('RESTAURANT_OWNER', 'ADMIN');
const rider = authorize('DELIVERY_PARTNER');

// Customers
orderRouter.post('/quote', customer, c.quote);
orderRouter.post('/', customer, c.place);
orderRouter.get('/', customer, c.listMine);

// Restaurants
orderRouter.get('/restaurant', owner, c.listForRestaurant);

// Delivery partners
orderRouter.get('/available', rider, c.available);
orderRouter.get('/deliveries', rider, c.myDeliveries);

// Any party to the order (access is checked per order)
orderRouter.get('/:id', c.get);
orderRouter.patch('/:id/status', owner, c.updateStatus);
orderRouter.post('/:id/cancel', authorize('CUSTOMER', 'RESTAURANT_OWNER', 'ADMIN'), c.cancel);
orderRouter.post('/:id/claim', rider, c.claim);
orderRouter.post('/:id/deliver', rider, c.deliver);
orderRouter.post('/:id/review', customer, c.review);
