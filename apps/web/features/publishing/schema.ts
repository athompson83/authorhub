import { z } from "zod";
import { publicationFonts } from "./fonts";
import { imageSourceSchema } from "@authorhub/manuscript";
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const image = imageSourceSchema.or(z.literal(""));
export const editionSchema = z
  .object({
    name: z.string().trim().min(1).max(200).default("First edition"),
    author: z.string().trim().max(200).default(""),
    publisher: z.string().trim().max(200).default(""),
    language: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
      .default("en"),
    isbn: z.string().max(20).default(""),
    description: z.string().max(10000).default(""),
    copyright: z.string().max(2000).default(""),
    trimWidth: z.number().min(4).max(12).default(7),
    trimHeight: z.number().min(6).max(16).default(10),
    margin: z.number().min(0.25).max(2).default(0.65),
    gutter: z.number().min(0).max(1).default(0.2),
    font: z.preprocess(
      (value) =>
        value === "Georgia"
          ? "DejaVu Serif"
          : value === "Times New Roman"
            ? "Liberation Serif"
            : value === "Arial"
              ? "Liberation Sans"
              : value,
      z.enum(publicationFonts).default("DejaVu Serif"),
    ),
    fontSize: z.number().min(8).max(24).default(11),
    lineHeight: z.number().min(1).max(2).default(1.45),
    paragraphSpacing: z.number().min(0).max(24).default(8),
    indent: z.number().min(0).max(1).default(0),
    accent: color.default("#2f5d50"),
    toc: z.boolean().default(true),
    pageNumbers: z.boolean().default(true),
    runningHeader: z.string().max(200).default(""),
    coverColor: color.default("#21483d"),
    coverTextColor: color.default("#ffffff"),
    coverInset: z.number().min(0.25).max(2).default(0.65),
    coverTitleOffset: z.number().min(0).max(5).default(0),
    backFontSize: z.number().min(8).max(32).default(12),
    spineFontSize: z.number().min(8).max(32).default(12),
    barcode: z.boolean().default(true),
    barcodeWidth: z.number().min(1.4).max(2.5).default(1.6),
    coverTitleSize: z.number().min(16).max(80).default(36),
    coverAlign: z.enum(["left", "center", "right"]).default("left"),
    coverImage: image.default(""),
    backImage: image.default(""),
    coverImageOpacity: z.number().min(0).max(1).default(0.5),
    backText: z.string().max(5000).default(""),
    spineText: z.string().max(200).default(""),
    spineWidth: z.number().min(0).max(3).default(0.5),
    bleed: z.number().min(0).max(0.25).default(0.125),
  })
  .superRefine((e, ctx) => {
    if (
      2 * e.margin + e.gutter >= e.trimWidth - 1 ||
      2 * e.margin >= e.trimHeight - 1
    )
      ctx.addIssue({
        code: "custom",
        message: "Margins leave insufficient room for text.",
      });
    const isbn = e.isbn.replace(/[-\s]/g, "");
    if (
      isbn &&
      (!/^97[89]\d{10}$/.test(isbn) ||
        [...isbn].reduce(
          (sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1),
          0,
        ) %
          10 !==
          0)
    )
      ctx.addIssue({
        code: "custom",
        path: ["isbn"],
        message: "Enter a valid ISBN-13 or leave it blank.",
      });
  });
export type Edition = z.infer<typeof editionSchema>;
export const defaultEdition = editionSchema.parse({});
