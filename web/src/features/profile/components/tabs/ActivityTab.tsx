'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { fetchActivityTimeline } from '@/features/profile/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 15;

const humanizeEvent = (e: string) =>
  e.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function ActivityTab({ employeeId }: { employeeId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'activity-timeline', page],
    queryFn: () => fetchActivityTimeline(employeeId, { page, limit: PAGE_SIZE }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Profile changes and HR actions will appear here."
      />
    );
  }

  const meta = data.meta;

  return (
    <div className="space-y-4">
      <ol className="relative space-y-4 border-l pl-6">
        {data.items.map((entry) => (
          <li key={entry.id} className="relative">
            <span className="absolute -left-[1.6rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-primary" />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{humanizeEvent(entry.eventType)}</Badge>
                <span className="text-sm">{entry.description}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
          </li>
        ))}
      </ol>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
