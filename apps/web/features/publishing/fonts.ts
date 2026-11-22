export const publicationFonts = [
  "DejaVu Serif",
  "Liberation Serif",
  "Liberation Sans",
] as const;
export type PublicationFont = (typeof publicationFonts)[number];
const prefixes: Record<PublicationFont, string> = {
  "DejaVu Serif": "dejavu-serif",
  "Liberation Serif": "liberation-serif",
  "Liberation Sans": "liberation-sans",
};
export function fontFaces(family: PublicationFont) {
  return (
    [
      { suffix: "regular", weight: 400, style: "normal" },
      { suffix: "bold", weight: 700, style: "normal" },
      { suffix: "italic", weight: 400, style: "italic" },
      { suffix: "bold-italic", weight: 700, style: "italic" },
    ] as const
  ).map((face) => ({
    ...face,
    filename: `${prefixes[family]}-${face.suffix}.ttf`,
  }));
}
export function fontCss(
  family: PublicationFont,
  location: (filename: string) => string,
) {
  const body = fontFaces(family)
    .map(
      (face) =>
        `@font-face{font-family:'${family}';font-weight:${face.weight};font-style:${face.style};src:url('${location(face.filename)}') format('truetype');font-display:block}`,
    )
    .join("");
  const barcode =
    family === "Liberation Sans"
      ? ""
      : `@font-face{font-family:'Liberation Sans';src:url('${location("liberation-sans-regular.ttf")}') format('truetype');font-display:block}`;
  return `${body}${barcode}@font-face{font-family:'Latin Modern Math';src:url('${location("latinmodern-math.otf")}') format('opentype');font-display:block}math{font-family:'Latin Modern Math'}`;
}
export type PublicationFontFile = {
  filename: string;
  bytes: Uint8Array;
  mediaType: "font/ttf" | "font/otf" | "text/plain";
};
