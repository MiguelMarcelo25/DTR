'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/lib/utils';
import type { ReportSummary as ReportSummaryData } from '@/features/reports/api';

/** Keys whose numeric value represents money (PHP). */
const MONEY_KEYS = new Set([
  'totalBasicPay',
  'totalGrossPay',
  'totalDeductions',
  'totalNetPay',
]);

/** Turn a camelCase summary key into a readable label. */
function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatValue(key: string, value: unknown): string {
  if (MONEY_KEYS.has(key)) return formatCurrency(Number(value));
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

/**
 * Render a report's `summary` object: scalar totals as a stat grid, and any
 * nested objects (e.g. `byStatus`) as a row of status badges with counts.
 */
export function ReportSummary({ summary }: { summary: ReportSummaryData }) {
  const scalars: [string, unknown][] = [];
  const groups: [string, Record<string, unknown>][] = [];

  for (const [key, value] of Object.entries(summary)) {
    if (value !== null && typeof value === 'object') {
      groups.push([key, value as Record<string, unknown>]);
    } else {
      scalars.push([key, value]);
    }
  }

  return (
    <Card className="rounded-xl border bg-card shadow-soft">
      <CardContent className="space-y-4 p-4">
        {scalars.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {scalars.map(([key, value]) => (
              <div key={key} className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{humanize(key)}</p>
                <p className="text-lg font-semibold">{formatValue(key, value)}</p>
              </div>
            ))}
          </div>
        )}

        {groups.map(([key, group]) => {
          const entries = Object.entries(group);
          if (entries.length === 0) return null;
          return (
            <div key={key} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{humanize(key)}</p>
              <div className="flex flex-wrap gap-2">
                {entries.map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                  >
                    <StatusBadge status={status} />
                    <span className="font-medium">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
