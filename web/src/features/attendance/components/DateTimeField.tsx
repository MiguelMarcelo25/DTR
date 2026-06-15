'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useController, useFormContext, type Control } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DateTimeFieldProps {
  name: string;
  control?: any;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Local field for `datetime-local` inputs, mirroring the shared form-field
 * shell (label · control · hint · error). The shared library only ships a
 * `DateField` (yyyy-MM-dd); correction punches need a full datetime, so this
 * keeps the on-brand look while binding to react-hook-form.
 */
export function DateTimeField({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
}: DateTimeFieldProps) {
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
        type="datetime-local"
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
