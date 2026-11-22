import Link from "next/link";
import { PasswordForm } from "@/features/account/password-form";
export default function ResetPassword() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <h1>Choose a new password</h1>
        <PasswordForm reset />
        <Link href="/library">Return to library</Link>
      </section>
    </main>
  );
}
