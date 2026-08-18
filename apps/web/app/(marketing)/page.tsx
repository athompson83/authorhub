import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark">A</span>AuthorHub</Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/sign-in" className="button">Sign in</Link>
          <Link href="/library" className="button primary">Open workspace</Link>
        </div>
      </header>
      <div className="container">
        <section className="marketing-hero">
          <div>
            <div className="eyebrow">From expertise to publication</div>
            <h1>Write books with structure, evidence, and control.</h1>
            <p className="hero-copy">
              Organize chapters, preserve every revision, connect factual claims to sources, work with AI transparently, and prepare professional print and ebook editions from one manuscript.
            </p>
            <div className="hero-actions">
              <Link href="/library" className="button primary">Start a book</Link>
              <a href="#workflow" className="button">See the workflow</a>
            </div>
          </div>
          <div className="card preview" id="workflow">
            <div className="eyebrow">Publication readiness</div>
            <div className="preview-row"><strong>Manuscript structure</strong><div className="status">12 / 12 chapters organized</div></div>
            <div className="preview-row"><strong>Evidence review</strong><div className="status">84 claims supported · 6 need review</div></div>
            <div className="preview-row"><strong>Editorial review</strong><div className="status">Developmental edit complete</div></div>
            <div className="preview-row"><strong>Edition outputs</strong><div className="muted">DOCX · EPUB · print-ready PDF</div></div>
          </div>
        </section>
      </div>
    </main>
  );
}
