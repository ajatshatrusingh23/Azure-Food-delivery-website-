import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { authRateLimit } from '@middlewares/rateLimit.middleware';
import { authController } from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, authController.register);
authRouter.post('/login', authRateLimit, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/logout-all', authenticate, authController.logoutAll);
authRouter.get('/me', authenticate, authController.me);
authRouter.get('/socket-token', authenticate, authController.socketToken);
