'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DatePickerProps {
  /** ISO 'yyyy-MM-dd' string. */
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
  className?: string;
  /** Adds an error ring to the trigger. */
  invalid?: boolean;
}

/**
 * Custom calendar date picker. A hand-built date-fns month grid mounted inside a
 * Radix Popover — so it positions/flips automatically and, crucially, behaves
 * correctly inside a Radix Dialog: the popover is its own layer on Radix's
 * DismissableLayer stack, so Escape dismisses the popover (not the host modal),
 * pointer-events are re-enabled on it, and focus is managed properly. The grid
 * uses roving tabindex + arrow/Home/End/PageUp/PageDown keyboard navigation.
 * Emits a 'yyyy-MM-dd' string; clearing emits ''.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  clearable = true,
  id,
  className,
  invalid,
}: DatePickerProps) {
  const selected = toDate(value);
  const [open, setOpen] = React.useState(false);
  // `focused` is both the keyboard cursor and the source of the displayed month.
  const [focused, setFocused] = React.useState<Date>(() => selected ?? new Date());
  const cellRefs = React.useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const rid = React.useId();
  const headingId = `${rid}-month`;

  // Keep the cursor aligned with the external value while the popover is closed.
  React.useEffect(() => {
    if (selected && !open) setFocused(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleOpenChange(next: boolean) {
    if (next) setFocused(selected ?? new Date());
    setOpen(next);
  }

  const monthDate = startOfMonth(focused);
  const monthKey = format(monthDate, 'yyyy-MM');
  // Calendar weeks (rows of 7) for a proper role="grid" / role="row" structure.
  const weeks = React.useMemo(() => {
    const gridStart = startOfWeek(monthDate);
    const gridEnd = endOfWeek(endOfMonth(monthDate));
    const all = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const rows: Date[][] = [];
    for (let i = 0; i < all.length; i += 7) rows.push(all.slice(i, i + 7));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  function moveCursor(next: Date) {
    setFocused(next);
    const key = format(next, 'yyyy-MM-dd');
    // Wait for the (possibly new) month to render, then move DOM focus.
    requestAnimationFrame(() => cellRefs.current.get(key)?.focus());
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    let next: Date | null = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(focused, -1); break;
      case 'ArrowRight': next = addDays(focused, 1); break;
      case 'ArrowUp': next = addDays(focused, -7); break;
      case 'ArrowDown': next = addDays(focused, 7); break;
      case 'PageUp': next = addMonths(focused, -1); break;
      case 'PageDown': next = addMonths(focused, 1); break;
      case 'Home': next = startOfWeek(focused); break;
      case 'End': next = endOfWeek(focused); break;
      default: return;
    }
    e.preventDefault();
    moveCursor(next);
  }

  function pick(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  }

  const showClear = clearable && !!selected && !disabled;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <div className={cn('relative', className)}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              showClear && 'pr-9',
              invalid && 'border-destructive focus-visible:ring-destructive',
              !disabled && 'cursor-pointer hover:border-primary/60',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
              {selected ? format(selected, 'MMM d, yyyy') : placeholder}
            </span>
          </button>
        </PopoverPrimitive.Trigger>

        {/* Clear — a real, keyboard-reachable button, sibling of the trigger. */}
        {showClear && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label="Choose date"
            onOpenAutoFocus={(e) => {
              // Focus the active day instead of the first nav button.
              e.preventDefault();
              const key = format(selected ?? focused, 'yyyy-MM-dd');
              requestAnimationFrame(() => cellRefs.current.get(key)?.focus());
            }}
            className="z-[60] w-[18rem] rounded-xl border bg-popover p-3 text-popover-foreground shadow-pop animate-scale-in"
          >
            {/* Month navigation */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveCursor(addMonths(focused, -1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span id={headingId} aria-live="polite" className="font-display text-sm font-semibold">
                {format(monthDate, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => moveCursor(addMonths(focused, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="mb-1 grid grid-cols-7 gap-0.5" aria-hidden="true">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid — roving tabindex + arrow-key navigation */}
            <div role="grid" aria-labelledby={headingId} onKeyDown={onGridKeyDown} className="space-y-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} role="row" className="grid grid-cols-7 gap-0.5">
                  {week.map((day) => {
                    const inMonth = isSameMonth(day, monthDate);
                    const isSel = !!selected && isSameDay(day, selected);
                    const isCursor = isSameDay(day, focused);
                    const today = isToday(day);
                    const key = format(day, 'yyyy-MM-dd');
                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        type="button"
                        role="gridcell"
                        aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                        aria-selected={isSel}
                        aria-current={today ? 'date' : undefined}
                        tabIndex={isCursor ? 0 : -1}
                        onClick={() => pick(day)}
                        onFocus={() => {
                          if (!isCursor) setFocused(day);
                        }}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          !inMonth && 'text-muted-foreground/40',
                          isSel
                            ? 'bg-primary font-semibold text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground',
                          today && !isSel && 'font-semibold text-primary',
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <button
                type="button"
                onClick={() => pick(new Date())}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Close
              </button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </div>
    </PopoverPrimitive.Root>
  );
}
