import { z } from 'zod';

export const approvalIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const approvalInboxQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.enum(['submittedAt', 'updatedAt', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  subjectType: z
    .enum([
      'ATTENDANCE_CORRECTION',
      'DTR_PERIOD',
      'LEAVE_REQUEST',
      'OVERTIME_REQUEST',
      'APPOINTMENT',
      'PROFILE_UPDATE_REQUEST',
    ])
    .optional(),
});

export const approvalActionSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    note: z.string().max(1000).optional(),
  })
  .refine((value) => value.decision === 'APPROVE' || Boolean(value.note?.trim()), {
    message: 'A note is required when rejecting',
    path: ['note'],
  });

export type ApprovalInboxQueryInput = z.infer<typeof approvalInboxQuerySchema>;
export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;
