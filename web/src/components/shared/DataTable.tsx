'use client';

import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Custom cell renderer; falls back to `row[key]`. */
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowKey?: (row: T, index: number) => string;
  /** Optional toolbar rendered above the table (search, filters, actions). */
  toolbar?: ReactNode;
  /** Make rows clickable. */
  onRowClick?: (row: T) => void;
}

const alignClass = (a?: 'left' | 'center' | 'right') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

export function DataTable<T>({
  columns,
  rows,
  loading,
  meta,
  onPageChange,
  emptyTitle,
  emptyDescription,
  getRowKey,
  toolbar,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="space-y-3">
      {toolbar && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{toolbar}</div>}

      <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      'h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                      alignClass(c.align),
                      c.headerClassName,
                    )}
                  >
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={alignClass(c.align)}>
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0">
                    <EmptyState title={emptyTitle ?? 'No records found'} description={emptyDescription} />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => (
                  <TableRow
                    key={getRowKey ? getRowKey(row, i) : String((row as Record<string, unknown>).id ?? i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.key} className={cn('py-3', alignClass(c.align), c.className)}>
                        {c.render ? c.render(row) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page <span className="font-medium text-foreground">{meta.page}</span> of {meta.totalPages}
            <span className="hidden sm:inline"> · {meta.total} total</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPrev} onClick={() => onPageChange?.(meta.page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => onPageChange?.(meta.page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
