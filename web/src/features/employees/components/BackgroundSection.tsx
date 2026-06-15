'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Modal } from '@/components/ui/modal';
import { Form } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';

export interface SectionItem {
  id: string;
}

interface BackgroundSectionProps<T extends SectionItem, V extends FieldValues> {
  title: string;
  description?: string;
  queryKey: unknown[];
  canManage: boolean;
  list: () => Promise<T[]>;
  create: (payload: Record<string, unknown>) => Promise<T>;
  update: (childId: string, payload: Record<string, unknown>) => Promise<T>;
  remove: (childId: string) => Promise<void>;
  /** Zod schema validating the form values. */
  schema: ZodType<V>;
  /** Render a row's display content. */
  renderItem: (item: T) => ReactNode;
  /** Map an existing item to form default values for editing. */
  toForm: (item: T | null) => V;
  /** Map form values to an API payload. */
  toPayload: (values: V) => Record<string, unknown>;
  /** Render the form fields (auto-bind to the <Form> via FormProvider context). */
  renderFields: () => ReactNode;
}

export function BackgroundSection<T extends SectionItem, V extends FieldValues>({
  title,
  description,
  queryKey,
  canManage,
  list,
  create,
  update,
  remove,
  schema,
  renderItem,
  toForm,
  toPayload,
  renderFields,
}: BackgroundSectionProps<T, V>) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const form = useForm<V>({
    resolver: zodResolver(schema as ZodType<FieldValues>) as never,
    defaultValues: toForm(null) as DefaultValues<V>,
  });

  const { data, isLoading } = useQuery({ queryKey, queryFn: list });

  // Keep the form in sync when the dialog opens for create/edit.
  useEffect(() => {
    if (open) form.reset(toForm(editing) as DefaultValues<V>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: V) => {
      const payload = toPayload(values);
      return editing ? update(editing.id, payload) : create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success(editing ? 'Updated.' : 'Added.');
      setOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (childId: string) => remove(childId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const singular = title.toLowerCase().replace(/s$/, '');

  return (
    <Card className="rounded-xl border bg-card shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()} yet`} />
        ) : (
          <div className="divide-y">
            {data.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1 text-sm">{renderItem(item)}</div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label={`Edit ${singular}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Delete ${singular}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title={`Delete this ${singular}?`}
                      description="This action cannot be undone."
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => deleteMutation.mutateAsync(item.id)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`${editing ? 'Edit' : 'Add'} ${singular}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="background-section-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <Form
          id="background-section-form"
          form={form}
          onSubmit={(values) => saveMutation.mutate(values as V)}
        >
          {renderFields()}
        </Form>
      </Modal>
    </Card>
  );
}
