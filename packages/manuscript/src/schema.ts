import { z } from 'zod';

export const blockIdSchema = z.string().regex(/^blk_[A-Za-z0-9_-]{16,}$/);

const textNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  marks: z
    .array(
      z.object({
        type: z.enum(['bold', 'italic', 'underline', 'strike', 'code']),
      }),
    )
    .optional(),
});

const blockAttrsSchema = z.object({
  blockId: blockIdSchema,
});

const paragraphSchema = z.object({
  type: z.literal('paragraph'),
  attrs: blockAttrsSchema,
  content: z.array(textNodeSchema).optional(),
});

const headingSchema = z.object({
  type: z.literal('heading'),
  attrs: blockAttrsSchema.extend({ level: z.number().int().min(1).max(6) }),
  content: z.array(textNodeSchema).optional(),
});

const blockquoteSchema = z.object({
  type: z.literal('blockquote'),
  attrs: blockAttrsSchema,
  content: z.array(paragraphSchema),
});

export const manuscriptBlockSchema = z.discriminatedUnion('type', [
  paragraphSchema,
  headingSchema,
  blockquoteSchema,
]);

export const manuscriptDocumentSchema = z.object({
  version: z.literal(1),
  type: z.literal('doc'),
  content: z.array(manuscriptBlockSchema),
});

export type ManuscriptBlock = z.infer<typeof manuscriptBlockSchema>;
export type ManuscriptDocument = z.infer<typeof manuscriptDocumentSchema>;
