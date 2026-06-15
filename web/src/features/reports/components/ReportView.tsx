'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { toast } from '@/components/ui/sonner';
import { getApiErrorMessage } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  exportReport,
  fetchReport,
  type ExportFormat,
  type ReportColumn,
  type ReportRow,
  type ReportType,
} from '@/features/reports/api';
import {
  EMPTY_FILTERS,
  ReportFilters,
  toReportFilters,
  type ReportFilterState,
} from '@/features/reports/components/ReportFilters';
import { ReportSummary } from '@/features/reports/components/ReportSummary';

const PAGE_LIMIT = 20;

/** Column keys whose values should render as currency. */
const MONEY_KEYS = new Set([
  'basicPay',
  'grossPay',
  'totalDeductions',
  'netPay',
  'basicSalary',
  'allowances',
]);

/** Column keys whose values should render as a status badge. */
const STATUS_KEYS = new Set(['status', 'employmentStatus']);

/** Column keys whose values are numeric (right-aligned). */
const NUMBER_KEYS = new Set([
  'lateMinutes',
  'undertimeMinutes',
  'workedHours',
  'totalHours',
  'totalDays',
  'days',
  'count',
  'present',
  'late',
  'absent',
]);

/** Detect an ISO-date column by key naming convention. */
function isDateKey(key: string): boolean {
  return /(^date$|Date$|At$)/.test(key);
}

function columnAlign(key: string): 'left' | 'right' {
  return MONEY_KEYS.has(key) || NUMBER_KEYS.has(key) ? 'right' : 'left';
}

interface ReportViewProps {
  type: ReportType;
  /** Show the free-text search box (only some reports search server-side). */
  showSearch?: boolean;
  emptyTitle?: string;
}

/**
 * Generic report viewer: wires the shared <ReportFilters>, a dynamic <DataTable>
 * driven by the server-supplied column metadata, a summary card, and CSV/PDF
 * export. Each report page just supplies its `type`.
 */
export function ReportView({ type, showSearch = true, emptyTitle }: ReportViewProps) {
  const [filters, setFilters] = useState<ReportFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const apiFilters = useMemo(() => toReportFilters(filters), [filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['reports', type, apiFilters, page],
    queryFn: () => fetchReport(type, { ...apiFilters, page, limit: PAGE_LIMIT }),
    placeholderData: (prev) => prev,
  });

  // Reset to page 1 whenever the filters change.
  function handleFilterChange(next: ReportFilterState) {
    setFilters(next);
    setPage(1);
  }

  async function handleExport(format: ExportFormat) {
    setExporting(true);
    try {
      // Export the full (filtered) dataset, not just the current page.
      await exportReport(type, format, { ...apiFilters, limit: 10000 });
      toast.success(`Export started (${format.toUpperCase()}).`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  const columns: Column<ReportRow>[] = useMemo(() => {
    const cols: ReportColumn[] = data?.columns ?? [];
    return cols.map((c) => {
      const align = columnAlign(c.key);
      return {
        key: c.key,
        header: c.label,
        align,
        className: NUMBER_KEYS.has(c.key) || MONEY_KEYS.has(c.key) ? 'tabular-nums' : undefined,
        render: (row: ReportRow) => {
          const value = row[c.key];
          if (value === null || value === undefined || value === '') return '—';
          if (STATUS_KEYS.has(c.key)) return <StatusBadge status={String(value)} />;
          if (MONEY_KEYS.has(c.key)) return formatCurrency(Number(value));
          if (isDateKey(c.key)) return formatDate(String(value));
          return String(value);
        },
      };
    });
  }, [data?.columns]);

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <ReportFilters
          value={filters}
          onChange={handleFilterChange}
          showSearch={showSearch}
          onExportCsv={() => handleExport('csv')}
          onExportPdf={() => handleExport('pdf')}
          exporting={exporting}
        />
      </div>

      {data?.summary && Object.keys(data.summary).length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <ReportSummary summary={data.summary} />
        </div>
      )}

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <DataTable<ReportRow>
          columns={columns}
          rows={data?.rows ?? []}
          loading={isLoading || (isFetching && !data)}
          meta={data?.meta}
          onPageChange={setPage}
          getRowKey={(_row, i) => `${type}-${page}-${i}`}
          emptyTitle={emptyTitle ?? 'No records found'}
          emptyDescription="Try adjusting the date range or filters."
        />
      </div>
    </div>
  );
}
