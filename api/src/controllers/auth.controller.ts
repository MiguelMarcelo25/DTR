import type { CookieOptions, Request, Response } from 'express';
import { env, isProd } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/response';
import { auditContext } from '../utils/audit';
import * as authService from '../services/auth.service';

const COOKIE = env.REFRESH_COOKIE_NAME;

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export const loginController = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, auditContext(req));
  res.cookie(COOKIE, result.refreshToken, refreshCookieOptions());
  return ok(res, { accessToken: result.accessToken, user: result.user }, 'Logged in');
});

export const registerController = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, auditContext(req));
  res.cookie(COOKIE, result.refreshToken, refreshCookieOptions());
  return created(res, { accessToken: result.accessToken, user: result.user }, 'Account created');
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[COOKIE] ?? req.body?.refreshToken;
  const result = await authService.refresh(raw, auditContext(req));
  res.cookie(COOKIE, result.refreshToken, refreshCookieOptions());
  return ok(res, { accessToken: result.accessToken, user: result.user }, 'Token refreshed');
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[COOKIE];
  await authService.logout(raw, req.user?.id, auditContext(req));
  res.clearCookie(COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  return ok(res, null, 'Logged out');
});

export const forgotPasswordController = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email, auditContext(req));
  return ok(
    res,
    result,
    'If an account exists for that email, a reset link has been sent.',
  );
});

export const resetPasswordController = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password, auditContext(req));
  return ok(res, null, 'Password has been reset. You may now log in.');
});

export const changePasswordController = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword,
    auditContext(req),
  );
  return ok(res, null, 'Password changed successfully.');
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.me(req.user!.id);
  return ok(res, user, 'OK');
});
