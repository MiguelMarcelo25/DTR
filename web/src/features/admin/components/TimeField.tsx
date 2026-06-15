'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import { useController, useFormContext, type Control } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Time field ("HH:mm") that matches the look & wiring of the shared
 * @/components/ui/form fields. The shared TextField does not support
 * type="time", so this thin local field fills that gap for schedules.
 */
export function TimeField({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
}: {
  name: string;
  control?: any;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const ctx = useFormContext();
  const { field, fieldState } = useController({
    name,
    control: (control ?? ctx?.control) as Control<any>,
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={name} className="text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      <Input
        id={name}
        type="time"
        disabled={disabled}
        className={cn(fieldState.error && 'border-destructive focus-visible:ring-destructive')}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
      />
      {fieldState.error ? (
        <p className="text-xs font-medium text-destructive">{fieldState.error.message}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
