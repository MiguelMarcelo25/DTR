import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/features/support/api';

export const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  description: z.string().min(5, 'Please describe your request (at least 5 characters)'),
  category: z.enum(TICKET_CATEGORIES as [string, ...string[]], {
    required_error: 'Select a category',
  }),
  priority: z.enum(TICKET_PRIORITIES as [string, ...string[]], {
    required_error: 'Select a priority',
  }),
});

export type CreateTicketValues = z.infer<typeof createTicketSchema>;
