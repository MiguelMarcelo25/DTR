import { z } from 'zod';

/**
 * Correction request form. Times are optional `datetime-local` strings; at
 * least one of the requested punch values must be present. The API expects
 * ISO datetimes, so the page converts non-empty values via `new Date(...)`.
 */
export const correctionSchema = z
  .object({
    date: z.string().min(1, 'A date is required'),
    requestedTimeIn: z.string().optional().or(z.literal('')),
    requestedTimeOut: z.string().optional().or(z.literal('')),
    requestedBreakIn: z.string().optional().or(z.literal('')),
    requestedBreakOut: z.string().optional().or(z.literal('')),
    reason: z.string().min(1, 'A reason is required'),
  })
  .refine(
    (d) =>
      Boolean(d.requestedTimeIn) ||
      Boolean(d.requestedTimeOut) ||
      Boolean(d.requestedBreakIn) ||
      Boolean(d.requestedBreakOut),
    {
      message: 'Provide at least one requested time',
      path: ['requestedTimeIn'],
    },
  );

export type CorrectionValues = z.infer<typeof correctionSchema>;

/** Optional review note when approving / rejecting a correction. */
export const reviewCorrectionSchema = z.object({
  reviewNote: z.string().optional().or(z.literal('')),
});

export type ReviewCorrectionValues = z.infer<typeof reviewCorrectionSchema>;
