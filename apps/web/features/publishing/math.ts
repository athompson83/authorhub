import katex from "katex";
const xml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function mathHtml(latex: string, display = false, strict = false) {
  try {
    return katex.renderToString(latex, {
      output: "mathml",
      displayMode: display,
      throwOnError: true,
      trust: false,
      maxExpand: 1000,
      maxSize: 20,
    });
  } catch (error) {
    if (strict) throw error;
    return `<code>${xml(latex)}</code>`;
  }
}
