import Link from "next/link";
import { PasswordForm } from "@/features/account/password-form";
export default function ForgotPassword() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <h1>Recover your account</h1>
        <p className="muted">
          Enter your account email to receive a password recovery link.
        </p>
        <PasswordForm />
        <Link href="/sign-in">Back to sign in</Link>
      </section>
    </main>
  );
}
