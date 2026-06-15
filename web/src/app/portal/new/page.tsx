'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  createTicket,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from '@/features/support/api';
import { createTicketSchema, type CreateTicketValues } from '@/schemas/support.schema';
import { getApiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, TextField, TextareaField, SelectField } from '@/components/ui/form';
import { toast } from '@/components/ui/sonner';
import { titleCase } from '@/features/support/components/ticketLabels';

const categoryOptions = TICKET_CATEGORIES.map((value) => ({ label: titleCase(value), value }));
const priorityOptions = TICKET_PRIORITIES.map((value) => ({ label: titleCase(value), value }));

export default function NewTicketPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const form = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { subject: '', description: '', category: 'GENERAL', priority: 'MEDIUM' },
  });

  async function onSubmit(values: CreateTicketValues) {
    try {
      const created = await createTicket({
        subject: values.subject,
        description: values.description,
        category: values.category as TicketCategory,
        priority: values.priority as TicketPriority,
      });
      await qc.invalidateQueries({ queryKey: ['portal', 'tickets'] });
      toast.success('Ticket submitted');
      router.push(`/portal/tickets/${created.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not submit your ticket'));
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <div className="animate-fade-up">
      <Link
        href="/portal"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      <PageHeader title="New ticket" description="Tell us what you need help with." />

      <Card className="p-6 shadow-soft">
        <Form form={form} onSubmit={onSubmit}>
          <TextField
            control={form.control}
            name="subject"
            label="Subject"
            placeholder="Brief summary of your request"
            required
          />
          <TextareaField
            control={form.control}
            name="description"
            label="Description"
            placeholder="Describe the issue or request in detail…"
            rows={6}
            required
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="category"
              label="Category"
              options={categoryOptions}
              placeholder="Select a category"
              required
            />
            <SelectField
              control={form.control}
              name="priority"
              label="Priority"
              options={priorityOptions}
              placeholder="Select a priority"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/portal">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit ticket
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
