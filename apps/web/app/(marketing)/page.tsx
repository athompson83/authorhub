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
            <h1>Build your textbook, from draft to publication.</h1>
            <p className="hero-copy">
              Write chapters, preserve revisions, design your cover and interior, and download print and ebook editions from one organized manuscript.
            </p>
            <div className="hero-actions">
              <Link href="/sign-up" className="button primary">Start a book</Link>
              <a href="#workflow" className="button">See the workflow</a>
            </div>
          </div>
          <div className="card preview" id="workflow">
            <div className="eyebrow">Publication readiness</div>
            <div className="preview-row"><strong>Write and organize</strong><div className="muted">Chapters, tables, figures and revision history</div></div>
            <div className="preview-row"><strong>Design your edition</strong><div className="muted">Cover, spine, typography and interior layout</div></div>
            <div className="preview-row"><strong>Freeze a publication copy</strong><div className="muted">Preserve the exact manuscript and design together</div></div>
            <div className="preview-row"><strong>Edition outputs</strong><div className="muted">DOCX · EPUB · interior and cover PDF</div></div>
          </div>
        </section>
      </div>
    </main>
  );
}
