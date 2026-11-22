import Link from "next/link";
import { ImportBook } from "@/features/books/import-book";
import { createClient } from "@/lib/supabase/server";
import { listBooks } from "@/features/books/repository";
import { BookCard } from "@/features/books/components/book-card";
import { NewBookForm } from "@/features/books/components/new-book-form";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const status =
    (await searchParams).status === "archived" ? "archived" : "active";
  const supabase = await createClient();
  const books = await listBooks(supabase, status);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{status === "archived" ? "Archived books" : "Your library"}</h2>
          <nav className="library-filters">
            <Link href="/library">Active books</Link>
            <Link href="/library?status=archived">Archived books</Link>
          </nav>
          <p className="muted" style={{ margin: 0 }}>
            Books stay organized from first outline through publication release.
          </p>
        </div>
      </div>

      <div className="library-layout">
        <section>
          {books.length ? (
            <div className="books-grid">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="card empty-card">
              <div>
                <strong>Your first manuscript starts here.</strong>
                <p style={{ marginBottom: 0 }}>
                  Create a project and AuthorHub will keep chapters, revisions,
                  artwork, and publication editions connected.
                </p>
              </div>
            </div>
          )}
        </section>
        <aside>
          <NewBookForm />
          <ImportBook />
        </aside>
      </div>
    </>
  );
}
