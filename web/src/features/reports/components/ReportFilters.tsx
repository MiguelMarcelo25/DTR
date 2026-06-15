'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, RotateCcw, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, DateField, SelectField, TextField, type SelectOption } from '@/components/ui/form';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchFilterOptions, type ReportFilters as ReportFilterParams } from '@/features/reports/api';

/** Sentinel used for the "All" option (Radix Select disallows empty values). */
const ALL = '__all__';

export interface ReportFilterState {
  from: string;
  to: string;
  departmentId: string;
  employeeId: string;
  search: string;
}

export const EMPTY_FILTERS: ReportFilterState = {
  from: '',
  to: '',
  departmentId: '',
  employeeId: '',
  search: '',
};

/** Convert the local UI state into the API filter shape (drops empties). */
export function toReportFilters(state: ReportFilterState): ReportFilterParams {
  return {
    from: state.from || undefined,
    to: state.to || undefined,
    departmentId: state.departmentId || undefined,
    employeeId: state.employeeId || undefined,
    search: state.search || undefined,
  };
}

/** Form-facing shape: selects hold the ALL sentinel instead of '' for "All". */
interface FilterFormValues {
  from: string;
  to: string;
  departmentId: string;
  employeeId: string;
  search: string;
}

/** State → form: map empty selects to the ALL sentinel. */
function toFormValues(state: ReportFilterState): FilterFormValues {
  return {
    from: state.from,
    to: state.to,
    departmentId: state.departmentId || ALL,
    employeeId: state.employeeId || ALL,
    search: state.search,
  };
}

/** Form → state: map the ALL sentinel back to ''. */
function fromFormValues(values: FilterFormValues): ReportFilterState {
  return {
    from: values.from || '',
    to: values.to || '',
    departmentId: values.departmentId === ALL ? '' : values.departmentId || '',
    employeeId: values.employeeId === ALL ? '' : values.employeeId || '',
    search: values.search || '',
  };
}

interface ReportFiltersProps {
  value: ReportFilterState;
  /** Called with the applied filter state (search is already debounced). */
  onChange: (next: ReportFilterState) => void;
  /** Whether to show the free-text search box. */
  showSearch?: boolean;
  /** Export handlers — when provided, render the CSV/PDF buttons. */
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  exporting?: boolean;
}

export function ReportFilters({
  value,
  onChange,
  showSearch = true,
  onExportCsv,
  onExportPdf,
  exporting = false,
}: ReportFiltersProps) {
  const { data } = useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: fetchFilterOptions,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<FilterFormValues>({
    defaultValues: toFormValues(value),
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Debounce the free-text search box; the structured filters apply instantly.
  const searchInput = form.watch('search');
  const debouncedSearch = useDebounce(searchInput, 400);

  const fromInput = form.watch('from');
  const toInput = form.watch('to');
  const deptInput = form.watch('departmentId');
  const empInput = form.watch('employeeId');

  // Lift the current form values up whenever a watched field settles.
  useEffect(() => {
    const next = fromFormValues({
      from: fromInput,
      to: toInput,
      departmentId: deptInput,
      employeeId: empInput,
      search: debouncedSearch,
    });
    if (
      next.from !== value.from ||
      next.to !== value.to ||
      next.departmentId !== value.departmentId ||
      next.employeeId !== value.employeeId ||
      next.search !== value.search
    ) {
      onChangeRef.current(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromInput, toInput, deptInput, empInput, debouncedSearch]);

  // Keep the form in sync when the parent resets/replaces the filter state.
  useEffect(() => {
    const formState = fromFormValues(form.getValues());
    if (
      value.from !== formState.from ||
      value.to !== formState.to ||
      value.departmentId !== formState.departmentId ||
      value.employeeId !== formState.employeeId ||
      value.search !== formState.search
    ) {
      form.reset(toFormValues(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const departmentOptions: SelectOption[] = [
    { label: 'All departments', value: ALL },
    ...(data?.departments ?? []).map((d) => ({ label: d.label, value: d.id })),
  ];
  const employeeOptions: SelectOption[] = [
    { label: 'All employees', value: ALL },
    ...(data?.employees ?? []).map((e) => ({ label: e.label, value: e.id })),
  ];

  function handleReset() {
    form.reset(toFormValues(EMPTY_FILTERS));
    onChangeRef.current(EMPTY_FILTERS);
  }

  return (
    <Card className="rounded-xl border bg-card shadow-soft">
      <CardContent className="p-4">
        <Form form={form} onSubmit={() => undefined} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DateField name="from" label="From" />
            <DateField name="to" label="To" />
            <SelectField
              name="departmentId"
              label="Department"
              options={departmentOptions}
              placeholder="All departments"
            />
            <SelectField
              name="employeeId"
              label="Employee"
              options={employeeOptions}
              placeholder="All employees"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {showSearch ? (
              <div className="w-full sm:max-w-xs">
                <TextField
                  name="search"
                  type="search"
                  placeholder="Search…"
                  leftIcon={<Search />}
                />
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              {onExportCsv && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={exporting}
                  onClick={onExportCsv}
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
              {onExportPdf && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={exporting}
                  onClick={onExportPdf}
                >
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              )}
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
