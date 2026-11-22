import { z } from "zod";

export const blockIdSchema = z.string().regex(/^blk_[A-Za-z0-9_-]{16,}$/);

const textNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z
    .array(
      z.object({
        type: z.enum(["bold", "italic", "underline", "strike", "code"]),
      }),
    )
    .optional(),
});

const inlineMathSchema = z.object({
  type: z.literal("inlineMath"),
  attrs: z.object({ latex: z.string().min(1).max(4000) }),
});
const footnoteSchema = z.object({
  type: z.literal("footnote"),
  attrs: z.object({
    noteId: z.string().uuid(),
    text: z.string().min(1).max(10000),
  }),
});
const citationSchema = z.object({
  type: z.literal("citation"),
  attrs: z.object({
    citationId: z.string().uuid(),
    sourceId: z.string().uuid(),
    locator: z.string().max(500),
  }),
});
const inlineSchema = z.union([
  textNodeSchema,
  inlineMathSchema,
  footnoteSchema,
  citationSchema,
]);
export type ManuscriptInline = z.infer<typeof inlineSchema>;
const blockAttrsSchema = z.object({
  blockId: blockIdSchema,
});

const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  attrs: blockAttrsSchema,
  content: z.array(inlineSchema).optional(),
});

const headingSchema = z.object({
  type: z.literal("heading"),
  attrs: blockAttrsSchema.extend({ level: z.number().int().min(1).max(6) }),
  content: z.array(inlineSchema).optional(),
});

export const imageSourceSchema = z
  .string()
  .max(30_000_000)
  .regex(
    /^(?:data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*|asset:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
const imageSchema = z.object({
  type: z.literal("image"),
  attrs: blockAttrsSchema.extend({
    src: imageSourceSchema,
    assetId: z.string().uuid().nullable().optional(),
    width:z.number().positive().max(4000).nullable().optional(),
    height:z.number().positive().max(4000).nullable().optional(),
    align:z.enum(["left","center","right"]).optional(),
    alt: z.string().min(1).max(1000),
    title: z.string().max(1000).nullable().optional(),
  }),
});
const textBlockSchema = z.discriminatedUnion("type", [
  paragraphSchema,
  headingSchema,
  z.object({
    type: z.literal("codeBlock"),
    attrs: blockAttrsSchema.extend({
      language: z.string().nullable().optional(),
    }),
    content: z.array(textNodeSchema).optional(),
  }),
]);
type TextBlock = z.infer<typeof textBlockSchema>;
type MathBlock = {
  type: "blockMath";
  attrs: { blockId: string; latex: string };
};
type ImageBlock = z.infer<typeof imageSchema>;
type ContainerType =
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "listItem"
  | "table"
  | "tableRow"
  | "tableCell"
  | "tableHeader";
export type ManuscriptBlock =
  | TextBlock
  | MathBlock
  | ImageBlock
  | {
      type: ContainerType;
      attrs: {
        blockId: string;
        start?: number | undefined;
        colspan?: number | undefined;
        rowspan?: number | undefined;
        colwidth?: number[] | null | undefined;
      };
      content: ManuscriptBlock[];
    };
export const manuscriptBlockSchema: z.ZodType<ManuscriptBlock> = z.lazy(() =>
  z.union([
    textBlockSchema,
    imageSchema,
    z.object({
      type: z.literal("blockMath"),
      attrs: blockAttrsSchema.extend({ latex: z.string().min(1).max(4000) }),
    }),
    z.object({
      type: z.enum([
        "blockquote",
        "bulletList",
        "orderedList",
        "listItem",
        "table",
        "tableRow",
        "tableCell",
        "tableHeader",
      ]),
      attrs: blockAttrsSchema.extend({
        start: z.number().int().positive().optional(),
        colspan: z.number().int().min(1).max(20).optional(),
        rowspan: z.number().int().min(1).max(100).optional(),
        colwidth: z.array(z.number().positive()).nullable().optional(),
      }),
      content: z.array(manuscriptBlockSchema),
    }),
  ]),
);
export const manuscriptDocumentSchema = z
  .object({
    version: z.literal(1),
    type: z.literal("doc"),
    content: z.array(manuscriptBlockSchema),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set<string>();
    const visit = (block: ManuscriptBlock, depth: number) => {
      if (depth > 12) {
        ctx.addIssue({
          code: "custom",
          message: "Manuscript nesting is too deep.",
        });
        return;
      }
      if (ids.has(block.attrs.blockId))
        ctx.addIssue({
          code: "custom",
          message: "Duplicate block identifier.",
        });
      ids.add(block.attrs.blockId);
      if (block.type === "image" || block.type === "blockMath") return;
      if (["paragraph", "heading", "codeBlock"].includes(block.type)) return;
      const parent = block as Extract<ManuscriptBlock, { type: ContainerType }>;
      const allowed: Partial<Record<ContainerType, string[]>> = {
        bulletList: ["listItem"],
        orderedList: ["listItem"],
        table: ["tableRow"],
        tableRow: ["tableCell", "tableHeader"],
      };
      for (const child of parent.content) {
        if (allowed[parent.type] && !allowed[parent.type]!.includes(child.type))
          ctx.addIssue({
            code: "custom",
            message: "Invalid manuscript structure.",
          });
        visit(child, depth + 1);
      }
    };
    for (const block of doc.content) {
      if (
        ["listItem", "tableRow", "tableCell", "tableHeader"].includes(
          block.type,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Invalid top-level manuscript block.",
        });
      visit(block, 0);
    }
  });
export type ManuscriptDocument = z.infer<typeof manuscriptDocumentSchema>;
