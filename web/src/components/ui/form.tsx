'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';
import {
  useController,
  useFormContext,
  FormProvider,
  type Control,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';

// ─────────────────────────────────────────────────────────────
// Form wrapper — sets up FormProvider so fields auto-bind.
// ─────────────────────────────────────────────────────────────

interface FormProps<T extends FieldValues> extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function Form<T extends FieldValues>({ form, onSubmit, children, className, ...props }: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className={cn('space-y-5', className)} noValidate {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared field shell (label · control · hint · error)
// ─────────────────────────────────────────────────────────────

interface BaseFieldProps {
  name: string;
  /** RHF control. Optional — falls back to the nearest <Form>/FormProvider.
   *  Typed loosely so any `useForm<T>().control` passes without generic friction. */
  control?: any;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function FieldShell({
  id,
  label,
  required,
  description,
  error,
  className,
  children,
}: {
  id: string;
  label?: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={id} className="text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

/** Resolve the RHF controller from an explicit control prop or a <Form> ancestor. */
function useField(name: string, control?: any) {
  const ctx = useFormContext();
  return useController({ name, control: (control ?? ctx?.control) as Control<any> });
}

// ─────────────────────────────────────────────────────────────
// Text / Email / Password
// ─────────────────────────────────────────────────────────────

interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  placeholder?: string;
  autoComplete?: string;
  inputClassName?: string;
  leftIcon?: React.ReactNode;
}

export function TextField({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  type = 'text',
  placeholder,
  autoComplete,
  inputClassName,
  leftIcon,
}: TextFieldProps) {
  const { field, fieldState } = useField(name, control);
  return (
    <FieldShell id={name} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {leftIcon}
          </span>
        )}
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(leftIcon && 'pl-9', fieldState.error && 'border-destructive focus-visible:ring-destructive', inputClassName)}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
        />
      </div>
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Number
// ─────────────────────────────────────────────────────────────

interface NumberFieldProps extends BaseFieldProps {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  inputClassName?: string;
}

export function NumberField({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  min,
  max,
  step,
  inputClassName,
}: NumberFieldProps) {
  const { field, fieldState } = useField(name, control);
  return (
    <FieldShell id={name} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Input
        id={name}
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(fieldState.error && 'border-destructive focus-visible:ring-destructive', inputClassName)}
        value={field.value ?? ''}
        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        onBlur={field.onBlur}
        ref={field.ref}
      />
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Date
// ─────────────────────────────────────────────────────────────

interface DateFieldProps extends BaseFieldProps {
  inputClassName?: string;
  placeholder?: string;
  clearable?: boolean;
}

export function DateField({ name, control, label, description, required, disabled, className, inputClassName, placeholder, clearable }: DateFieldProps) {
  const { field, fieldState } = useField(name, control);
  // Normalise ISO datetime → yyyy-MM-dd for the custom calendar picker.
  const value = typeof field.value === 'string' ? field.value.slice(0, 10) : field.value ?? '';
  return (
    <FieldShell id={name} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
      <DatePicker
        id={name}
        value={value}
        onChange={(v) => field.onChange(v)}
        disabled={disabled}
        invalid={!!fieldState.error}
        placeholder={placeholder}
        clearable={clearable}
        className={inputClassName}
      />
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Textarea
// ─────────────────────────────────────────────────────────────

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string;
  rows?: number;
  inputClassName?: string;
}

export function TextareaField({ name, control, label, description, required, disabled, className, placeholder, rows = 4, inputClassName }: TextareaFieldProps) {
  const { field, fieldState } = useField(name, control);
  return (
    <FieldShell id={name} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(fieldState.error && 'border-destructive focus-visible:ring-destructive', inputClassName)}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
      />
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Select
// ─────────────────────────────────────────────────────────────

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
}

export function SelectField({
  name,
  control,
  label,
  description,
  required,
  disabled,
  className,
  options,
  placeholder = 'Select…',
  triggerClassName,
}: SelectFieldProps) {
  const { field, fieldState } = useField(name, control);
  return (
    <FieldShell id={name} label={label} required={required} description={description} error={fieldState.error?.message} className={className}>
      <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={disabled}>
        <SelectTrigger id={name} className={cn(fieldState.error && 'border-destructive focus:ring-destructive', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Checkbox / Switch (inline label)
// ─────────────────────────────────────────────────────────────

interface ToggleFieldProps extends BaseFieldProps {}

export function CheckboxField({ name, control, label, description, disabled, className }: ToggleFieldProps) {
  const { field, fieldState } = useField(name, control);
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2.5">
        <Checkbox id={name} checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
        {label && (
          <Label htmlFor={name} className="cursor-pointer font-normal">
            {label}
          </Label>
        )}
      </div>
      {fieldState.error ? (
        <p className="text-xs font-medium text-destructive">{fieldState.error.message}</p>
      ) : description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function SwitchField({ name, control, label, description, disabled, className }: ToggleFieldProps) {
  const { field } = useField(name, control);
  return (
    <div className={cn('flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3', className)}>
      <div className="space-y-0.5">
        {label && <Label htmlFor={name} className="cursor-pointer">{label}</Label>}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
    </div>
  );
}
