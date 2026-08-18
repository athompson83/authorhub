'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignUpForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.replace('/library');
        router.refresh();
        return;
      }
      setMessage('Account created. Check your email to confirm your address, then sign in.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="fullName">Name</label><input id="fullName" required value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div>
      {error ? <p role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p> : null}
      {message ? <p role="status" style={{ color: 'var(--accent)', fontSize: 13 }}>{message}</p> : null}
      <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
    </form>
  );
}
