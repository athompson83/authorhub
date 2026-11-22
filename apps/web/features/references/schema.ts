import { z } from "zod";
export const sourceInputSchema = z.object({
  title: z.string().trim().min(1).max(500),
  author: z.string().trim().max(500).default(""),
  year: z.string().trim().max(50).default(""),
  publisher: z.string().trim().max(500).default(""),
  url: z
    .string()
    .max(2000)
    .url()
    .regex(/^https?:\/\//)
    .or(z.literal(""))
    .default(""),
  doi: z.string().max(300).default(""),
  notes: z.string().max(10000).default(""),
});
export const sourceSchema = sourceInputSchema.extend({
  id: z.string().uuid(),
  version: z.number().int().positive().default(1),
});
export type BookSource = z.infer<typeof sourceSchema>;
