'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { getAuditLog } from '@/features/admin/api';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 break-words">{value ?? '—'}</span>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs scrollbar-thin">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function AuditLogDetailDialog({
  id,
  open,
  onOpenChange,
}: {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', id],
    queryFn: () => getAuditLog(id as string),
    enabled: open && !!id,
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Audit Log Detail"
      description="Full record of the logged action."
    >
      {isLoading || !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-0.5">
            <Field label="Action" value={<Badge variant="secondary">{data.action}</Badge>} />
            <Field label="Module" value={<StatusBadge status={data.module} />} />
            <Field label="Description" value={data.description} />
            <Field label="Performed by" value={data.user?.email} />
            <Field label="User ID" value={data.userId} />
            <Field label="Employee ID" value={data.employeeId} />
            <Field label="When" value={formatDateTime(data.createdAt)} />
            <Field label="IP address" value={data.ipAddress} />
            <Field label="User agent" value={data.userAgent} />
          </div>

          {(data.oldValues != null || data.newValues != null) && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <JsonBlock label="Old values" value={data.oldValues} />
                <JsonBlock label="New values" value={data.newValues} />
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
