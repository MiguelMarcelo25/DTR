'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDateTime, initials } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import {
  getTicket,
  moveTicket,
  updateTicket,
  assignTicket,
  addComment,
  fetchAssignableStaff,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_LABELS,
  type TicketComment,
} from '@/features/support/api';
import { titleCase } from './badges';

function authorName(a: TicketComment['author']): string {
  return a.clientProfile?.fullName
    ?? (a.employee?.profile ? `${a.employee.profile.firstName} ${a.employee.profile.lastName}` : a.email);
}

export function TicketDetailModal({ ticketId, onClose }: { ticketId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const open = !!ticketId;
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => getTicket(ticketId as string),
    enabled: open,
  });

  const { data: staff = [] } = useQuery({ queryKey: ['support', 'assignable'], queryFn: fetchAssignableStaff, enabled: open });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['support', 'ticket', ticketId] });
    qc.invalidateQueries({ queryKey: ['support', 'board'] });
    qc.invalidateQueries({ queryKey: ['support', 'stats'] });
  };

  const statusMut = useMutation({
    mutationFn: (status: string) => moveTicket(ticketId as string, status as never),
    onSuccess: () => { toast.success('Status updated'); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const priorityMut = useMutation({
    mutationFn: (priority: string) => updateTicket(ticketId as string, { priority: priority as never }),
    onSuccess: () => { toast.success('Priority updated'); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const assignMut = useMutation({
    mutationFn: (assigneeId: string) => assignTicket(ticketId as string, assigneeId === '__none__' ? null : assigneeId),
    onSuccess: () => { toast.success('Assignee updated'); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const commentMut = useMutation({
    mutationFn: () => addComment(ticketId as string, reply.trim(), internal),
    onSuccess: () => { setReply(''); setInternal(false); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={ticket ? `${ticket.ticketNo} · ${ticket.subject}` : 'Ticket'}
    >
      {isLoading || !ticket ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          {/* Main */}
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                From {ticket.client.clientProfile?.fullName ?? ticket.client.email}
                {ticket.client.clientProfile?.company ? ` · ${ticket.client.clientProfile.company}` : ''} ·{' '}
                {formatDateTime(ticket.createdAt)}
              </p>
            </div>

            {/* Conversation */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Conversation</h4>
              {ticket.comments.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
              {ticket.comments.map((c) => (
                <div key={c.id} className={cn('rounded-lg border p-3 text-sm', c.isInternal && 'border-amber-300 bg-amber-50 dark:bg-amber-950/20')}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary">
                        {initials(authorName(c.author))}
                      </span>
                      {authorName(c.author)}
                      {c.isInternal && <span className="text-xs font-normal text-amber-600">internal note</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap pl-8">{c.body}</p>
                </div>
              ))}

              {/* Reply box */}
              <div className="space-y-2 rounded-lg border p-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={internal} onCheckedChange={setInternal} />
                    Internal note (hidden from client)
                  </label>
                  <Button size="sm" disabled={!reply.trim() || commentMut.isPending} onClick={() => commentMut.mutate()}>
                    {commentMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar actions */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={ticket.status} onValueChange={(v) => statusMut.mutate(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={ticket.priority} onValueChange={(v) => priorityMut.mutate(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={ticket.assignee?.id ?? '__none__'} onValueChange={(v) => assignMut.mutate(v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <div><StatusBadge status={ticket.category} /></div>
            </div>

            {/* History */}
            <div className="space-y-2 border-t pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Activity</p>
              <ul className="space-y-1.5">
                {ticket.events.slice(0, 8).map((ev) => (
                  <li key={ev.id} className="text-xs text-muted-foreground">
                    <span className="text-foreground">{ev.description}</span>
                    <br />
                    {formatDateTime(ev.createdAt)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
