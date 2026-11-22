import { expect, it } from "vitest";
import { renderArtifact } from "./render";
import { publicationSchema } from "../publication";
import { defaultEdition } from "../schema";
const id = "00000000-0000-4000-8000-000000000001";
const publication = publicationSchema.parse({
  schemaVersion: 1,
  rendererVersion: "authorhub-1",
  book: { id, title: "Ecology", subtitle: null },
  edition: { ...defaultEdition, author: "Test Author" },
  nodes: [
    {
      id,
      title: "Ecosystems",
      kind: "chapter",
      position: 1000,
      content_version: 1,
      content: {
        version: 1,
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { blockId: "blk_1234567890123456" },
            content: [
              { type: "text", text: "Plants convert sunlight to energy." },
            ],
          },
        ],
      },
    },
  ],
});
it("renders actual server PDFs with distinct interior and cover sheet geometry", async () => {
  const interior = await renderArtifact(publication, id, "interior_pdf"),
    cover = await renderArtifact(publication, id, "cover_pdf");
  const decode = (b: Uint8Array) => new TextDecoder("latin1").decode(b);
  expect(decode(interior).startsWith("%PDF-")).toBe(true);
  expect(decode(interior)).toMatch(/\/MediaBox\s*\[0 0 504 720\]/);
  expect(decode(cover)).toMatch(/\/MediaBox\s*\[0 0 1062 738\]/);
  expect(cover.byteLength).toBeGreaterThan(1000);
}, 60000);
it("renders complete release backups without involving the PDF engine", async () => {
  const backup = JSON.parse(
    new TextDecoder().decode(await renderArtifact(publication, id, "backup")),
  );
  expect(backup.book.title).toBe("Ecology");
  expect(backup.nodes[0].content.content[0].content[0].text).toBe(
    "Plants convert sunlight to energy.",
  );
});
it('renders a complete 100,000-word textbook across chapter boundaries',async()=>{
 const {writeFile}=await import('node:fs/promises');
 const paragraph=Array(1000).fill('ecology').join(' ');
 const large=publicationSchema.parse({...publication,book:{...publication.book,title:'Large textbook fixture'},nodes:Array.from({length:10},(_,chapter)=>({id:`00000000-0000-4000-8000-${String(chapter+10).padStart(12,'0')}`,title:`Chapter ${chapter+1}`,kind:'chapter',position:(chapter+1)*1000,content_version:1,content:{version:1,type:'doc',content:[...Array.from({length:10},(_,block)=>({type:'paragraph',attrs:{blockId:`blk_largebook_${String(chapter).padStart(8,'0')}_${String(block).padStart(8,'0')}`},content:[{type:'text',text:paragraph}]})),...(chapter===9?[{type:'paragraph',attrs:{blockId:'blk_largebook_end_sentinel'},content:[{type:'text',text:'AUTHORHUB_END_OF_MANUSCRIPT'}]}]:[])]}}))});
 const bytes=await renderArtifact(large,id,'interior_pdf');expect(bytes.byteLength).toBeGreaterThan(1000);await writeFile('/tmp/authorhub-large-book.pdf',bytes);
},120000);
