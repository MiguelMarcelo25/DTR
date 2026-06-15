'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useController, useFormContext, type Control } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

/** Index 0=Sun .. 6=Sat */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Multi-toggle for work days, bound to react-hook-form. Value is a
 * number[] of weekday indices (0=Sun..6=Sat) — preserves the existing
 * submit payload shape.
 */
export function WorkDaysField({
  name,
  control,
  label = 'Work days',
  required,
  className,
}: {
  name: string;
  control?: any;
  label?: string;
  required?: boolean;
  className?: string;
}) {
  const ctx = useFormContext();
  const { field, fieldState } = useController({
    name,
    control: (control ?? ctx?.control) as Control<any>,
  });

  const selected: number[] = Array.isArray(field.value) ? field.value : [];

  function toggleDay(day: number) {
    const next = selected.includes(day)
      ? selected.filter((d) => d !== day)
      : [...selected, day];
    field.onChange(next.sort((a, b) => a - b));
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className="text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      <div className="flex flex-wrap gap-2">
        {DAYS.map((dayLabel, idx) => {
          const active = selected.includes(idx);
          return (
            <Button
              key={dayLabel}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="sm"
              className="cursor-pointer"
              onClick={() => toggleDay(idx)}
            >
              {dayLabel}
            </Button>
          );
        })}
      </div>
      {fieldState.error && (
        <p className="text-xs font-medium text-destructive">{fieldState.error.message as string}</p>
      )}
    </div>
  );
}
