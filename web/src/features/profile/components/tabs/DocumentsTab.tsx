'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Upload } from 'lucide-react';
import {
  fetchDocuments,
  uploadDocument,
  type EmployeeDocument,
} from '@/features/profile/api';
import { DOCUMENT_TYPE_VALUES } from '@/schemas/profile.schema';
import { documentTypeLabel } from '@/features/profile/helpers';
import { getApiErrorMessage } from '@/lib/api';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;
const ALL = 'ALL';

export function DocumentsTab({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<string>(ALL);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', employeeId, 'documents', page, debouncedSearch, docType],
    queryFn: () =>
      fetchDocuments(employeeId, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        documentType: docType === ALL ? undefined : docType,
      }),
  });

  const columns: Column<EmployeeDocument & Record<string, unknown>>[] = [
    { key: 'documentName', header: 'Name' },
    {
      key: 'documentType',
      header: 'Type',
      render: (r) => <Badge variant="outline">{documentTypeLabel(r.documentType)}</Badge>,
    },
    { key: 'expirationDate', header: 'Expires', render: (r) => formatDate(r.expirationDate) },
    { key: 'createdAt', header: 'Uploaded', render: (r) => formatDate(r.createdAt) },
    {
      key: 'fileUrl',
      header: 'File',
      align: 'right',
      render: (r) => (
        <a
          href={r.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Open <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ),
    },
  ];

  const toolbar = (
    <>
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search documents…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={docType}
          onValueChange={(v) => {
            setDocType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {DOCUMENT_TYPE_VALUES.map((t) => (
              <SelectItem key={t} value={t}>
                {documentTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <UploadDocumentDialog
        employeeId={employeeId}
        onUploaded={() =>
          qc.invalidateQueries({ queryKey: ['profile', employeeId, 'documents'] })
        }
      />
    </>
  );

  return (
    <div className="animate-fade-up">
      <DataTable
        columns={columns}
        rows={(data?.items ?? []) as (EmployeeDocument & Record<string, unknown>)[]}
        loading={isLoading}
        meta={data?.meta}
        onPageChange={setPage}
        toolbar={toolbar}
        emptyTitle="No documents"
        emptyDescription="Upload your documents to keep your records complete."
      />
    </div>
  );
}

function UploadDocumentDialog({
  employeeId,
  onUploaded,
}: {
  employeeId: string;
  onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<string>('OTHER');
  const [expirationDate, setExpirationDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Please choose a file to upload');
      return uploadDocument(employeeId, {
        file,
        documentName: documentName.trim() || file.name,
        documentType,
        remarks: remarks.trim() || null,
        expirationDate: expirationDate || null,
      });
    },
    onSuccess: () => {
      toast.success('Document uploaded.');
      onUploaded();
      setOpen(false);
      setFile(null);
      setDocumentName('');
      setDocumentType('OTHER');
      setExpirationDate('');
      setRemarks('');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Upload failed')),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Upload document
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Upload document"
        description="Attach a file and label it for your records."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !file}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">
              File<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="doc-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">Document name</Label>
            <Input
              id="doc-name"
              value={documentName}
              placeholder="e.g. Resume 2026"
              onChange={(e) => setDocumentName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_VALUES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {documentTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-exp">Expiration date (optional)</Label>
            <Input
              id="doc-exp"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-remarks">Remarks (optional)</Label>
            <Textarea
              id="doc-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
