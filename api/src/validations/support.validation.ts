import { z } from 'zod';

export const idParam = z.object({ id: z.string().uuid() });

const CATEGORY = ['GENERAL', 'TECHNICAL', 'BILLING', 'ACCOUNT', 'FEEDBACK', 'OTHER'] as const;
const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const STATUS = ['NEW', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject is too short').max(160),
  description: z.string().min(5, 'Please describe the issue'),
  category: z.enum(CATEGORY).default('GENERAL'),
  priority: z.enum(PRIORITY).default('MEDIUM'),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(3).max(160).optional(),
  description: z.string().min(5).optional(),
  category: z.enum(CATEGORY).optional(),
  priority: z.enum(PRIORITY).optional(),
});

export const moveTicketSchema = z.object({
  status: z.enum(STATUS),
  boardOrder: z.coerce.number().int().min(0).optional(),
});

export const assignTicketSchema = z.object({
  assigneeId: z.string().uuid().nullable().optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty'),
  isInternal: z.boolean().optional().default(false),
});

export const listTicketsQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  status: z.enum(STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
  category: z.enum(CATEGORY).optional(),
  assigneeId: z.string().uuid().optional(),
});
