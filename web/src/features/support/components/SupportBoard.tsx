'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api';
import { toast } from '@/components/ui/sonner';
import { getBoard, moveTicket, STATUS_LABELS, type Board, type TicketStatus } from '@/features/support/api';
import { STATUS_ACCENT } from './badges';
import { TicketCard } from './TicketCard';
import { TicketDetailModal } from './TicketDetailModal';

export function SupportBoard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['support', 'board'], queryFn: getBoard });
  const [columns, setColumns] = useState<Board['columns']>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TicketStatus | null>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    if (data) setColumns(data.columns);
  }, [data]);

  const move = useMutation({
    mutationFn: ({ id, status, order }: { id: string; status: TicketStatus; order: number }) =>
      moveTicket(id, status, order),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support', 'board'] });
      qc.invalidateQueries({ queryKey: ['support', 'stats'] });
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e));
      if (data) setColumns(data.columns); // revert
    },
  });

  function onDragStart(e: React.DragEvent, id: string) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDrop(targetStatus: TicketStatus) {
    const id = dragId.current;
    dragId.current = null;
    setOverCol(null);
    if (!id) return;

    const fromCol = columns.find((c) => c.tickets.some((t) => t.id === id));
    if (!fromCol || fromCol.status === targetStatus) return;
    const ticket = fromCol.tickets.find((t) => t.id === id)!;

    // Optimistic local move to the end of the target column
    setColumns((prev) =>
      prev.map((c) => {
        if (c.status === fromCol.status) return { ...c, tickets: c.tickets.filter((t) => t.id !== id) };
        if (c.status === targetStatus) return { ...c, tickets: [...c.tickets, { ...ticket, status: targetStatus }] };
        return c;
      }),
    );
    const order = columns.find((c) => c.status === targetStatus)?.tickets.length ?? 0;
    move.mutate({ id, status: targetStatus, order });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
        {columns.map((col) => (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.status); }}
            onDragLeave={() => setOverCol((s) => (s === col.status ? null : s))}
            onDrop={() => onDrop(col.status)}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors',
              overCol === col.status && 'border-primary/50 bg-primary/5',
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_ACCENT[col.status])} />
                {STATUS_LABELS[col.status]}
              </span>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {col.tickets.length}
              </span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-2" style={{ minHeight: 120, maxHeight: 'calc(100vh - 260px)' }}>
              {col.tickets.map((t) => (
                <TicketCard key={t.id} ticket={t} onDragStart={onDragStart} onClick={() => setSelected(t.id)} />
              ))}
              {col.tickets.length === 0 && (
                <p className="px-2 py-8 text-center text-xs text-muted-foreground">Drop tickets here</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <TicketDetailModal ticketId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
