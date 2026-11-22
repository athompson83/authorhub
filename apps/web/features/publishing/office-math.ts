import { DOMParser } from "@xmldom/xmldom";
import { ImportedXmlComponent } from "docx";
import { mathHtml } from "./math";
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
/** Convert semantic MathML to editable Office Math, never a screenshot. */
export function officeMath(latex: string) {
  const document = new DOMParser().parseFromString(
    mathHtml(latex, false, true),
    "application/xml",
  );
  const root = document.getElementsByTagName("math")[0];
  if (!root) throw new Error("Equation could not be parsed.");
  function render(node: Node): string {
    if (node.nodeType === 3)
      return node.textContent?.trim()
        ? `<m:r><m:t xml:space="preserve">${xml(node.textContent)}</m:t></m:r>`
        : "";
    if (node.nodeType !== 1) return "";
    const element = node as Element,
      tag = element.localName,
      children = Array.from(element.childNodes).filter((n) => n.nodeType === 1);
    const child = (i: number) => (children[i] ? render(children[i]!) : "");
    const all = () => children.map(render).join("");
    if (tag === "annotation" || tag === "annotation-xml") return "";
    if (tag === "semantics") return child(0);
    if (["mi", "mn", "mo", "mtext", "ms"].includes(tag))
      return `<m:r>${tag === "mtext" ? "<m:rPr><m:nor/></m:rPr>" : ""}<m:t xml:space="preserve">${xml(element.textContent ?? "")}</m:t></m:r>`;
    if (tag === "mfrac")
      return `<m:f><m:num>${child(0)}</m:num><m:den>${child(1)}</m:den></m:f>`;
    if (tag === "msup")
      return `<m:sSup><m:e>${child(0)}</m:e><m:sup>${child(1)}</m:sup></m:sSup>`;
    if (tag === "msub")
      return `<m:sSub><m:e>${child(0)}</m:e><m:sub>${child(1)}</m:sub></m:sSub>`;
    if (tag === "msubsup")
      return `<m:sSubSup><m:e>${child(0)}</m:e><m:sub>${child(1)}</m:sub><m:sup>${child(2)}</m:sup></m:sSubSup>`;
    if (tag === "msqrt" || tag === "mroot")
      return `<m:rad><m:radPr>${tag === "msqrt" ? '<m:degHide m:val="1"/>' : ""}</m:radPr><m:deg>${tag === "mroot" ? child(1) : ""}</m:deg><m:e>${tag === "mroot" ? child(0) : all()}</m:e></m:rad>`;
    if (tag === "mover")
      return `<m:acc><m:accPr><m:chr m:val="${xml(children[1]?.textContent ?? "¯")}"/></m:accPr><m:e>${child(0)}</m:e></m:acc>`;
    if (tag === "munder")
      return `<m:limLow><m:e>${child(0)}</m:e><m:lim>${child(1)}</m:lim></m:limLow>`;
    if (tag === "munderover")
      return `<m:limUpp><m:e><m:limLow><m:e>${child(0)}</m:e><m:lim>${child(1)}</m:lim></m:limLow></m:e><m:lim>${child(2)}</m:lim></m:limUpp>`;
    if (tag === "mtable") return `<m:m>${all()}</m:m>`;
    if (tag === "mtr") return `<m:mr>${all()}</m:mr>`;
    if (tag === "mtd") return `<m:e>${all()}</m:e>`;
    if (tag === "mspace") return '<m:r><m:t xml:space="preserve"> </m:t></m:r>';
    return all();
  }
  return ImportedXmlComponent.fromXmlString(
    `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${render(root as unknown as Node)}</m:oMath>`,
  );
}
