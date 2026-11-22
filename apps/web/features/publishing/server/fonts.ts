import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fontFaces,
  type PublicationFont,
  type PublicationFontFile,
} from "../fonts";
export async function loadPublicationFonts(family: PublicationFont) {
  const names = [
    ...new Set([
      ...fontFaces(family).map((face) => face.filename),
      "liberation-sans-regular.ttf",
      "latinmodern-math.otf",
      "MATH-LICENSE.txt",
      "LPPL-LICENSE.txt",
      "MATH-README.txt",
      "LIBERATION-LICENSE.txt",
      ...(family === "DejaVu Serif" ? ["DEJAVU-LICENSE.txt"] : []),
    ]),
  ];
  return Promise.all(
    names.map(async (filename): Promise<PublicationFontFile> => ({
      filename,
      mediaType: filename.endsWith(".ttf")
        ? "font/ttf"
        : filename.endsWith(".otf")
          ? "font/otf"
          : "text/plain",
      bytes: await readFile(join(process.cwd(), "public", "fonts", filename)),
    })),
  );
}
