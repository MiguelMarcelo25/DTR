'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, FileText, ExternalLink, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import {
  Form,
  TextField,
  DateField,
  TextareaField,
  SelectField,
  type SelectOption,
} from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { formatDate } from '@/lib/utils';
import {
  listDocuments,
  uploadDocument,
  deleteDocument,
  type EmployeeDocument,
} from '@/features/employees/api';
import { EmployeeTabs } from '@/features/employees/components/EmployeeTabs';
import {
  DOCUMENT_TYPES,
  documentUploadSchema,
  type DocumentUploadValues,
} from '@/schemas/employees.schema';

const ALL = 'ALL';

const documentTypeOptions: SelectOption[] = DOCUMENT_TYPES.map((t) => ({
  label: t.replace(/_/g, ' '),
  value: t,
}));

export default function EmployeeDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [typeFilter, setTypeFilter] = useState(ALL);

  // Upload dialog state
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<DocumentUploadValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: { documentName: '', documentType: 'OTHER', remarks: '', expirationDate: '' },
  });

  const params = useMemo(
    () => ({
      page,
      limit: 10,
      search: search || undefined,
      documentType: typeFilter === ALL ? undefined : typeFilter,
    }),
    [page, search, typeFilter],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id, 'documents', params],
    queryFn: () => listDocuments(id, params),
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadDocument(id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id, 'documents'] });
      toast.success('Document uploaded.');
      setOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Upload failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (childId: string) => deleteDocument(id, childId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id, 'documents'] });
      toast.success('Document deleted.');
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Reset the form (and the uncontrolled file input) each time the dialog opens.
  useEffect(() => {
    if (open) {
      form.reset({ documentName: '', documentType: 'OTHER', remarks: '', expirationDate: '' });
      if (fileRef.current) fileRef.current.value = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleUpload(values: DocumentUploadValues) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Please choose a file.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentName', values.documentName.trim());
    fd.append('documentType', values.documentType ?? 'OTHER');
    if (values.remarks?.trim()) fd.append('remarks', values.remarks.trim());
    if (values.expirationDate) fd.append('expirationDate', values.expirationDate);
    uploadMutation.mutate(fd);
  }

  const columns: Column<EmployeeDocument>[] = [
    {
      key: 'documentName',
      header: 'Document',
      render: (d) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {d.documentName}
        </span>
      ),
    },
    { key: 'documentType', header: 'Type', render: (d) => d.documentType.replace(/_/g, ' ') },
    { key: 'expirationDate', header: 'Expires', render: (d) => formatDate(d.expirationDate) },
    { key: 'createdAt', header: 'Uploaded', render: (d) => formatDate(d.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '1%',
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" asChild>
            <a href={d.fileUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </Button>
          {canManage && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete document">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              }
              title="Delete document?"
              description="This action cannot be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={() => deleteMutation.mutateAsync(d.id)}
            />
          )}
        </div>
      ),
    },
  ];

  const toolbar = (
    <div className="grid w-full gap-3 sm:grid-cols-3">
      <div className="relative sm:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search documents"
          placeholder="Document name…"
          className="pl-9"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <Select
        value={typeFilter}
        onValueChange={(v) => {
          setTypeFilter(v);
          setPage(1);
        }}
      >
        <SelectTrigger aria-label="Type filter">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {DOCUMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <PageHeader
          title="Documents"
          description="Employee files and certifications."
          action={
            canManage ? (
              <Button onClick={() => setOpen(true)}>
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            ) : undefined
          }
        />
        <EmployeeTabs employeeId={id} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
        <DataTable<EmployeeDocument>
          columns={columns}
          rows={data?.items ?? []}
          loading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          emptyTitle="No documents"
          emptyDescription="Upload the employee's files to get started."
          getRowKey={(d) => d.id}
          toolbar={toolbar}
        />
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Upload Document"
        description="Attach a file and describe it for the employee's record."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploadMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="document-upload-form" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </>
        }
      >
        <Form id="document-upload-form" form={form} onSubmit={handleUpload}>
          <div className="space-y-1.5">
            <Label htmlFor="file">
              File<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input id="file" type="file" ref={fileRef} />
          </div>
          <TextField name="documentName" label="Document name" required />
          <SelectField name="documentType" label="Type" options={documentTypeOptions} />
          <DateField name="expirationDate" label="Expiration date" />
          <TextareaField name="remarks" label="Remarks" />
        </Form>
      </Modal>
    </div>
  );
}
