'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { fetchMe } from '@/features/profile/api';

/**
 * Resolve the signed-in user's employeeId. Prefer the value already on the auth
 * user; fall back to GET /auth/me (e.g. right after a hard reload before the
 * provider has fully hydrated). Returns `null` when the account has no linked
 * employee record.
 */
export function useMyEmployeeId(): {
  employeeId: string | null;
  isLoading: boolean;
  isError: boolean;
} {
  const { user } = useAuth();
  const fromAuth = user?.employeeId ?? null;

  const query = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: fetchMe,
    enabled: !!user && !fromAuth,
    staleTime: 5 * 60 * 1000,
  });

  if (fromAuth) {
    return { employeeId: fromAuth, isLoading: false, isError: false };
  }

  return {
    employeeId: query.data?.employeeId ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
