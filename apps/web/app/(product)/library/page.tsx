import { createClient } from '@/lib/supabase/server';
import { listBooks } from '@/features/books/repository';
import { BookCard } from '@/features/books/components/book-card';
import { NewBookForm } from '@/features/books/components/new-book-form';

export default async function LibraryPage() {
  const supabase = await createClient();
  const books = await listBooks(supabase);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Your library</h2>
          <p className="muted" style={{ margin: 0 }}>Books stay organized from first outline through publication release.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 22, alignItems: 'start' }}>
        <section>
          {books.length ? (
            <div className="books-grid">
              {books.map((book) => <BookCard key={book.id} book={book} />)}
            </div>
          ) : (
            <div className="card empty-card">
              <div>
                <strong>Your first manuscript starts here.</strong>
                <p style={{ marginBottom: 0 }}>Create a project and AuthorHub will keep chapters, revisions, sources, and future editions connected.</p>
              </div>
            </div>
          )}
        </section>
        <aside><NewBookForm /></aside>
      </div>
    </>
  );
}
