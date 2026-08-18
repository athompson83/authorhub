import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createChapterAction } from '@/features/manuscript/actions';
import { getBookWorkspace, listManuscriptNodes } from '@/features/manuscript/repository';
import { ChapterEditor } from '@/features/manuscript/components/chapter-editor';

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ node?: string }>;
}) {
  const [{ bookId }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  let book;
  let nodes;
  try {
    [book, nodes] = await Promise.all([
      getBookWorkspace(supabase, bookId),
      listManuscriptNodes(supabase, bookId),
    ]);
  } catch {
    notFound();
  }

  const selected = nodes.find((node) => node.id === query.node) ?? nodes.find((node) => node.kind === 'chapter') ?? nodes[0];
  const addChapter = createChapterAction.bind(null, book.id);

  return (
    <div style={{ margin: '-34px -38px -70px', minHeight: 'calc(100vh - 68px)', background: 'var(--surface)' }}>
      <header className="book-workspace-header">
        <div>
          <Link href="/library" className="muted" style={{ fontSize: 12 }}>← Library</Link>
          <div className="book-workspace-title">{book.title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button" type="button">Share</button>
          <button className="button primary" type="button">Publication readiness</button>
        </div>
      </header>

      <div className="book-workspace-grid">
        <aside className="manuscript-outline">
          <div className="outline-heading">
            <span>Manuscript</span>
            <span className="muted">{nodes.length}</span>
          </div>
          <nav aria-label="Manuscript outline">
            {nodes.map((node, index) => (
              <Link
                key={node.id}
                href={`/books/${book.id}?node=${node.id}`}
                className={`outline-node ${selected?.id === node.id ? 'active' : ''}`}
              >
                <span className="outline-index">{node.kind === 'chapter' ? index + 1 : '•'}</span>
                <span>{node.title || 'Untitled'}</span>
              </Link>
            ))}
          </nav>
          <form action={addChapter} className="add-chapter-form">
            <input name="title" placeholder="New chapter title" required maxLength={200} aria-label="New chapter title" />
            <button type="submit">+ Add chapter</button>
          </form>
        </aside>

        <section className="manuscript-canvas">
          {selected ? (
            <>
              <div className="chapter-heading">
                <div className="eyebrow">{selected.kind.replace('_', ' ')}</div>
                <h1>{selected.title || 'Untitled'}</h1>
              </div>
              <ChapterEditor
                key={selected.id}
                nodeId={selected.id}
                initialContent={selected.content}
                initialVersion={selected.contentVersion}
              />
            </>
          ) : (
            <div className="empty-manuscript">
              <div>
                <div className="eyebrow">Ready to begin</div>
                <h2>Add your first chapter</h2>
                <p className="muted">AuthorHub stores each chapter independently so long books remain fast and every passage can be addressed by sources, comments, and revisions.</p>
              </div>
            </div>
          )}
        </section>

        <aside className="book-inspector">
          <div className="inspector-tabs"><strong>Brief</strong><span>Sources</span><span>Claims</span><span>History</span></div>
          <section className="inspector-section">
            <div className="nav-label" style={{ paddingLeft: 0 }}>Audience</div>
            <p>{book.audience || 'No audience defined yet.'}</p>
          </section>
          <section className="inspector-section">
            <div className="nav-label" style={{ paddingLeft: 0 }}>Book purpose</div>
            <p>{book.purpose || 'No purpose statement defined yet.'}</p>
          </section>
          <section className="inspector-section">
            <div className="nav-label" style={{ paddingLeft: 0 }}>Target</div>
            <p>{book.targetWordCount ? `${book.targetWordCount.toLocaleString()} words` : 'No target word count'}</p>
          </section>
          <div className="inspector-coming-soon">Source evidence, claim review, and revision history plug into this panel in the next subsystem slices.</div>
        </aside>
      </div>
    </div>
  );
}
