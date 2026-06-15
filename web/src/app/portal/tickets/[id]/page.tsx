'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { getTicket, addComment } from '@/features/support/api';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn, formatDateTime } from '@/lib/utils';
import {
  titleCase,
  PriorityBadge,
  authorDisplayName,
  isStaffComment,
} from '@/features/support/components/ticketLabels';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { user } = useAuth();
  const [reply, setReply] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['portal', 'ticket', id],
    queryFn: () => getTicket(id),
    enabled: !!id,
  });

  const sendReply = useMutation({
    mutationFn: (body: string) => addComment(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'ticket', id] });
      setReply('');
      toast.success('Reply sent');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not send your reply')),
  });

  function handleSend() {
    const body = reply.trim();
    if (!body) return;
    sendReply.mutate(body);
  }

  return (
    <div className="animate-fade-up space-y-5">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !ticket ? (
        <EmptyState
          title="Ticket not found"
          description="This ticket may have been removed or you don't have access to it."
        />
      ) : (
        <>
          {/* Header card */}
          <Card className="space-y-3 p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{ticket.ticketNo}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={ticket.priority} />
              <Badge variant="outline">{titleCase(ticket.category)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted {formatDateTime(ticket.createdAt)}
            </p>
          </Card>

          {/* Description card */}
          <Card className="space-y-2 p-6 shadow-soft">
            <h2 className="text-sm font-semibold text-muted-foreground">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
          </Card>

          {/* Comment thread */}
          <Card className="space-y-4 p-6 shadow-soft">
            <h2 className="text-sm font-semibold text-muted-foreground">Conversation</h2>

            {ticket.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No replies yet. Add a message below and our team will respond.
              </p>
            ) : (
              <div className="space-y-3">
                {ticket.comments.map((comment) => {
                  const staff = isStaffComment(comment.author);
                  const mine = !staff && comment.author.id === user?.id;
                  return (
                    <div
                      key={comment.id}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-xl border px-4 py-2.5 text-sm',
                          mine
                            ? 'border-primary/20 bg-primary/10'
                            : 'border-border bg-muted/50',
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold">
                            {authorDisplayName(comment.author)}
                            {staff && (
                              <span className="ml-1.5 font-normal text-muted-foreground">· Support</span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{comment.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply box */}
            <div className="space-y-2 border-t pt-4">
              <Textarea
                rows={3}
                placeholder="Write a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={sendReply.isPending}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSend}
                  disabled={sendReply.isPending || !reply.trim()}
                >
                  {sendReply.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
