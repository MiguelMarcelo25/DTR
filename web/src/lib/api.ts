import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from '@/types';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function apiBaseUrl(rawUrl: string): string {
  const url = rawUrl.trim().replace(/\/+$/, '');
  if (!url) return '/api';
  return url.endsWith('/api') ? url : `${url}/api`;
}

const API_BASE_URL = apiBaseUrl(RAW_API_URL);

/**
 * Access token lives in memory only (never localStorage — avoids XSS token
 * theft). The refresh token is an httpOnly cookie the browser sends with
 * `withCredentials`. On hard reload, memory is empty and the app silently
 * refreshes via the cookie on first protected request.
 */
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Shared single-flight refresh ──
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post<{ data: { accessToken: string } }>(
      `${API_BASE_URL}/auth/refresh-token`,
      {},
      { withCredentials: true },
    );
    const token = res.data?.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const code = error.response?.data?.code;
    const status = error.response?.status;

    const isAuthRoute = original?.url?.includes('/auth/');
    if (status === 401 && code === 'TOKEN_EXPIRED' && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      // Coalesce concurrent 401s into ONE refresh request.
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const token = await refreshPromise;
      refreshPromise = null;

      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a human-friendly message from an axios error. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiErrorBody | undefined)?.message ?? fallback;
  }
  return fallback;
}
