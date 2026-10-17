import type { CookieOptions, Request, Response } from 'express';
import { env } from '@config/env';
import { currentUser } from '@middlewares/auth.middleware';
import { ApiResponse } from '@utils/ApiResponse';
import { COOKIES, REFRESH_COOKIE_PATH } from '@utils/constants';
import { authService, type AuthResult, type ClientInfo } from './auth.service';
import { loginSchema, registerSchema } from './auth.validator';

const baseCookie: CookieOptions = {
  httpOnly: true, // JavaScript (and therefore XSS) can't read the tokens
  secure: env.cookies.secure,
  sameSite: env.cookies.sameSite,
};

const setAuthCookies = (res: Response, result: AuthResult) => {
  res.cookie(COOKIES.ACCESS_TOKEN, result.accessToken, { ...baseCookie, path: '/', maxAge: env.jwt.accessTtlSeconds * 1000 });
  res.cookie(COOKIES.REFRESH_TOKEN, result.refreshToken, {
    ...baseCookie,
    path: REFRESH_COOKIE_PATH, // only sent to /api/v1/auth/*
    maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie(COOKIES.ACCESS_TOKEN, { ...baseCookie, path: '/' });
  res.clearCookie(COOKIES.REFRESH_TOKEN, { ...baseCookie, path: REFRESH_COOKIE_PATH });
};

const clientInfo = (req: Request): ClientInfo => ({ userAgent: req.get('user-agent'), ip: req.ip });

/** The access token is also returned in the body for non-browser clients (Bearer auth). */
const authBody = (result: AuthResult) => ({
  user: result.user,
  accessToken: result.accessToken,
  expiresIn: env.jwt.accessTtlSeconds,
});

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(registerSchema.parse(req.body), clientInfo(req));
    setAuthCookies(res, result);
    ApiResponse.created(res, authBody(result), 'Account created');
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(loginSchema.parse(req.body), clientInfo(req));
    setAuthCookies(res, result);
    ApiResponse.ok(res, authBody(result), 'Logged in');
  },

  async refresh(req: Request, res: Response) {
    try {
      const result = await authService.refresh(req.cookies?.[COOKIES.REFRESH_TOKEN], clientInfo(req));
      setAuthCookies(res, result);
      ApiResponse.ok(res, authBody(result), 'Session refreshed');
    } catch (err) {
      // A dead session must not leave stale cookies behind (a 409 race keeps them).
      if ((err as { statusCode?: number }).statusCode !== 409) clearAuthCookies(res);
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.[COOKIES.REFRESH_TOKEN]);
    clearAuthCookies(res);
    ApiResponse.ok(res, null, 'Logged out');
  },

  async logoutAll(req: Request, res: Response) {
    const revoked = await authService.logoutEverywhere(currentUser(req).id);
    clearAuthCookies(res);
    ApiResponse.ok(res, { revokedSessions: revoked }, 'Logged out from all devices');
  },

  async me(req: Request, res: Response) {
    ApiResponse.ok(res, await authService.me(currentUser(req).id));
  },

  socketToken(req: Request, res: Response) {
    ApiResponse.ok(res, { token: authService.socketToken(currentUser(req)), expiresIn: 60 });
  },
};
