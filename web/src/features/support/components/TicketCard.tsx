'use client';

import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials, formatDate } from '@/lib/utils';
import { PriorityBadge } from './badges';
import type { TicketSummary } from '@/features/support/api';

export function TicketCard({
  ticket,
  onDragStart,
  onClick,
}: {
  ticket: TicketSummary;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
}) {
  const clientName = ticket.client.clientProfile?.fullName ?? ticket.client.email;
  const assignee = ticket.assignee?.profile
    ? `${ticket.assignee.profile.firstName} ${ticket.assignee.profile.lastName}`
    : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, ticket.id)}
      onClick={onClick}
      className="group cursor-pointer rounded-lg border bg-card p-3 shadow-soft transition-all hover:border-primary/40 hover:shadow-card active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{ticket.ticketNo}</span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <p className="line-clamp-2 text-sm font-medium leading-snug">{ticket.subject}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{clientName}</p>

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {ticket._count?.comments ?? 0}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">{formatDate(ticket.createdAt)}</span>
          {assignee && (
            <Avatar className="h-6 w-6" title={assignee}>
              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initials(assignee)}</AvatarFallback>
            </Avatar>
          )}
        </span>
      </div>
    </div>
  );
}
