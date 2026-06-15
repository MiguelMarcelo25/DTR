import type { ReactNode } from 'react';

/** A label/value pair laid out in a responsive two-column grid. */
export function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  const display =
    value === null || value === undefined || value === '' ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      value
    );
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:col-span-2 break-words">{display}</dd>
    </div>
  );
}
