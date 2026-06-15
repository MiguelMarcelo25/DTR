import type { ReactNode } from 'react';

/** Read-only labelled value used across employee detail pages. */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value === null || value === undefined || value === '' ? '—' : value}</p>
    </div>
  );
}
