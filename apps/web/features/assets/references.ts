/** Asset references stay canonical; signed URLs exist only in presentation. */
export function replaceAssetReferences<T>(
  value: T,
  resolve: (id: string) => string,
): T {
  function visit(node: unknown): unknown {
    if (typeof node === "string" && /^asset:[0-9a-f-]{36}$/i.test(node))
      return resolve(node.slice(6));
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === "object")
      return Object.fromEntries(
        Object.entries(node).map(([key, value]) => [key, visit(value)]),
      );
    return node;
  }
  return visit(value) as T;
}
export function canonicalizeEditorImages<T>(value: T): T {
  function visit(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(visit);
    if (node && typeof node === "object") {
      const obj = node as {
        type?: string;
        attrs?: { assetId?: string | null; src?: string };
      };
      if (obj.type === "image" && obj.attrs?.assetId)
        return {
          ...obj,
          attrs: { ...obj.attrs, src: `asset:${obj.attrs.assetId}` },
        };
      return Object.fromEntries(
        Object.entries(node).map(([key, value]) => [key, visit(value)]),
      );
    }
    return node;
  }
  return visit(value) as T;
}
