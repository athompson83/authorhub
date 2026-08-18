import Link from 'next/link';
import type { BookSummary } from '../repository';

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link href={`/books/${book.id}`} className="card book-card">
      <div>
        <div className="status">ACTIVE MANUSCRIPT</div>
        <div className="book-title" style={{ marginTop: 10 }}>{book.title}</div>
        {book.subtitle ? <p className="muted" style={{ margin: '7px 0 0', fontSize: 14 }}>{book.subtitle}</p> : null}
      </div>
      <div>
        <div className="progress"><span style={{ width: '4%' }} /></div>
        <div className="meta-row">
          <span>{book.target_word_count ? `${book.target_word_count.toLocaleString()} word target` : 'No word target'}</span>
          <span>Open →</span>
        </div>
      </div>
    </Link>
  );
}
