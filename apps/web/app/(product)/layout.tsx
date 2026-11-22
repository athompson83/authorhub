import Link from "next/link";
import { SignOut } from "@/features/account/sign-out";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/library" className="brand">
          <span className="brand-mark">A</span>AuthorHub
        </Link>
        <div className="account-controls">
          <span className="muted">{user.email}</span>
          <SignOut />
        </div>
      </header>
      <div className="product-grid">
        <aside className="sidebar" aria-label="Primary navigation">
          <nav className="nav-section">
            <div className="nav-label">Workspace</div>
            <Link className="nav-item active" href="/library">
              Library
            </Link>
            <Link className="nav-item" href="/account">
              Account settings
            </Link>
          </nav>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
