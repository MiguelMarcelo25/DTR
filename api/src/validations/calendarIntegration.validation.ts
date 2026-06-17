import { z } from 'zod';

export const syncNowSchema = z
  .object({
    appointmentId: z.string().uuid('A valid appointment id is required').optional(),
  })
  .strict();

export const retryFailedSchema = z
  .object({
    limit: z.coerce.number().int().positive().max(100).default(25).optional(),
  })
  .strict();

export type SyncNowInput = z.infer<typeof syncNowSchema>;
export type RetryFailedInput = z.infer<typeof retryFailedSchema>;
