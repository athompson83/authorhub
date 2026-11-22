import Link from "next/link";
import type { BookSummary } from "../repository";

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <article className="card book-card">
      <Link href={`/books/${book.id}`}>
        <div>
          <div className="status">
            {book.status === "archived"
              ? "ARCHIVED MANUSCRIPT"
              : "ACTIVE MANUSCRIPT"}
          </div>
          <div className="book-title" style={{ marginTop: 10 }}>
            {book.title}
          </div>
          {book.subtitle ? (
            <p className="muted" style={{ margin: "7px 0 0", fontSize: 14 }}>
              {book.subtitle}
            </p>
          ) : null}
        </div>
      </Link>
      <div>
        <div className="meta-row">
          <span>
            {book.target_word_count
              ? `${book.target_word_count.toLocaleString()} word target`
              : "No word target"}
          </span>
          <Link href={`/books/${book.id}`}>Open →</Link>
        </div>
      </div>
      <Link
        href={`/books/${book.id}/settings`}
        className="muted"
        style={{ fontSize: 12 }}
      >
        Book settings
      </Link>
    </article>
  );
}
