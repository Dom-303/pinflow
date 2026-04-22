/**
 * Shared server types for relay HTTP responses
 * @module @pinflow/relay/server/types
 */
import { PinFlowErrorCode, ProblemDetailsSchema } from '@pinflow/core';
import { z } from 'zod';

export const RelayErrorResponseSchema = z.object({
  error: z.string().describe('The error message'),
  code: z.enum(PinFlowErrorCode).describe('The error code'),
  ...ProblemDetailsSchema.omit({
    code: true,
  }).partial({
    title: true,
  }).shape,
  hint: z
    .string()
    .optional()
    .describe('Additional information to help the user or agent fix the error'),
});

export type RelayErrorResponse = z.infer<typeof RelayErrorResponseSchema>;
