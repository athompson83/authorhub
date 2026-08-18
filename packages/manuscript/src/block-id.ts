const BLOCK_ID_PATTERN = /^blk_[A-Za-z0-9_-]{16,}$/;

export function createBlockId(): string {
  return `blk_${globalThis.crypto.randomUUID().replaceAll('-', '')}`;
}

export function isBlockId(value: string): boolean {
  return BLOCK_ID_PATTERN.test(value);
}
