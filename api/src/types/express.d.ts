import type { AuthUser } from './index';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware on protected routes. */
      user?: AuthUser;
    }
  }
}

export {};
