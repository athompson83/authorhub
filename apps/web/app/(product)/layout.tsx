import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in');

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/library" className="brand"><span className="brand-mark">A</span>AuthorHub</Link>
        <div className="muted" style={{ fontSize: 13 }}>{user.email}</div>
      </header>
      <div className="product-grid">
        <aside className="sidebar" aria-label="Primary navigation">
          <nav className="nav-section">
            <div className="nav-label">Workspace</div>
            <Link className="nav-item active" href="/library">Library</Link>
            <span className="nav-item">Search</span>
            <span className="nav-item">Recent</span>
            <span className="nav-item">Templates</span>
          </nav>
          <nav className="nav-section">
            <div className="nav-label">Account</div>
            <span className="nav-item">Settings</span>
          </nav>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
