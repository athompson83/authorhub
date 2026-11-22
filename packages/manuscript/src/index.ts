export { extractBlockIndex } from "./block-index";
export type { ManuscriptBlockIndexEntry } from "./block-index";
export { createBlockId, isBlockId } from "./block-id";
export { ensureStableBlockIds } from "./normalize";
export {
  blockIdSchema,
  imageSourceSchema,
  manuscriptBlockSchema,
  manuscriptDocumentSchema,
} from "./schema";
export type {
  ManuscriptBlock,
  ManuscriptDocument,
  ManuscriptInline,
} from "./schema";
