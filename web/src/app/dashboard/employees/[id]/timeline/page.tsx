'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime } from '@/lib/utils';
import { listActivityTimeline } from '@/features/employees/api';
import { EmployeeTabs } from '@/features/employees/components/EmployeeTabs';

export default function EmployeeTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id, 'timeline', page],
    queryFn: () => listActivityTimeline(id, { page, limit: 20 }),
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-fade-up">
        <PageHeader title="Activity Timeline" description="A chronological record of key events." />
        <EmployeeTabs employeeId={id} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No activity yet" description="Events appear here as the record changes." />
      ) : (
        <Card className="animate-fade-up rounded-xl border bg-card shadow-soft" style={{ animationDelay: '60ms' }}>
          <CardContent className="p-6">
            <ol className="relative space-y-6 border-l pl-6">
              {data.items.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{event.eventType.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>

            {data.meta && data.meta.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Page {data.meta.page} of {data.meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.meta.hasPrev}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.meta.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
