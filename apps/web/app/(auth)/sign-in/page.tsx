import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Link href="/" className="brand">
          <span className="brand-mark">A</span>AuthorHub
        </Link>
        <h1>Welcome back.</h1>
        <p className="muted">
          Continue working on your manuscripts, sources, and publication
          packages.
        </p>
        <SignInForm />
        <p>
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        <p>
          <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
