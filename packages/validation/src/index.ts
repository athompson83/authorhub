import { z } from 'zod';

export const nonEmptyString = z.string().trim().min(1);
export const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

export const positiveInteger = z.number().int().positive();

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}
