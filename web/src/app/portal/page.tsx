'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { listTickets } from '@/features/support/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { titleCase, PriorityBadge } from '@/features/support/components/ticketLabels';

export default function PortalTicketsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'tickets', page],
    queryFn: () => listTickets({ page, limit: 10 }),
  });

  const tickets = data?.items ?? [];
  const meta = data?.meta;

  const newTicketButton = (
    <Button asChild>
      <Link href="/portal/new">
        <Plus className="h-4 w-4" />
        New ticket
      </Link>
    </Button>
  );

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="My Support Tickets"
        description="Submit a request and track its progress."
        action={newTicketButton}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="Submit your first support request."
          action={newTicketButton}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/portal/tickets/${ticket.id}`} className="block">
              <Card className="cursor-pointer p-4 shadow-soft transition-colors hover:bg-accent/40 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ticket.ticketNo}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="truncate font-medium">{ticket.subject}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={ticket.priority} />
                      <Badge variant="outline">{titleCase(ticket.category)}</Badge>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(ticket.createdAt)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1 text-sm">
              <p className="text-muted-foreground">
                Page <span className="font-medium text-foreground">{meta.page}</span> of{' '}
                {meta.totalPages}
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
      )}
    </div>
  );
}
