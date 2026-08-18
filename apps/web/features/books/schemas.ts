import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  subtitle: z.string().trim().max(240).optional(),
  audience: z.string().trim().max(500).optional(),
  purpose: z.string().trim().max(1000).optional(),
  targetWordCount: z.coerce.number().int().positive().max(500_000).optional(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
