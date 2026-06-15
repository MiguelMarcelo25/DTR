import { api, setAccessToken } from '@/lib/api';
import type { ApiResponse, AuthUser } from '@/types';

export async function loginRequest(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>('/auth/login', {
    email,
    password,
  });
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  company?: string;
  phone?: string;
}

export async function registerRequest(input: RegisterInput): Promise<AuthUser> {
  const res = await api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>(
    '/auth/register',
    input,
  );
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
}

export async function bootstrapSession(): Promise<AuthUser | null> {
  // Try to mint an access token from the httpOnly refresh cookie, then load the user.
  try {
    const res = await api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>(
      '/auth/refresh-token',
      {},
    );
    setAccessToken(res.data.data.accessToken);
    return res.data.data.user;
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function meRequest(): Promise<AuthUser> {
  const res = await api.get<ApiResponse<AuthUser>>('/auth/me');
  return res.data.data;
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post('/auth/logout', {});
  } finally {
    setAccessToken(null);
  }
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPasswordRequest(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password });
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}
