import type { AuthUser } from './types';

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate`. Undefined on public routes. */
      user?: AuthUser;
      /** Raw request body, kept only for the payment webhook (signature is over the exact bytes). */
      rawBody?: Buffer;
    }
  }
}

export {};
