import Link from 'next/link';
import { SignUpForm } from './sign-up-form';

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Link href="/" className="brand"><span className="brand-mark">A</span>AuthorHub</Link>
        <h1>Create your workspace.</h1>
        <p className="muted">Your account receives a private author workspace automatically.</p>
        <SignUpForm />
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Already have an account? <Link href="/sign-in" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in</Link></p>
      </section>
    </main>
  );
}
