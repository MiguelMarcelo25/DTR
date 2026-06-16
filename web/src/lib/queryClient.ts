import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Fresh data (< staleTime) is served instantly from cache; once stale —
        // e.g. after a create/update invalidates a list — it refetches on mount
        // so new rows always appear. (refetchOnMount left at the default `true`.)
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
