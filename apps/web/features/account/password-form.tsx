"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setMessage("");
        try {
          const db = createClient();
          if (reset) {
            const { error } = await db.auth.updateUser({
              password: String(form.get("password")),
            });
            if (error) throw error;
            setMessage("Password updated. You can return to your library.");
          } else {
            const { error } = await db.auth.resetPasswordForEmail(
              String(form.get("email")),
              {
                redirectTo: `${window.location.origin}/auth/callback?recovery=1`,
              },
            );
            if (error) throw error;
            setMessage(
              "If an account exists, a password recovery email has been sent.",
            );
          }
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to complete this request.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor={reset ? "newPassword" : "recoveryEmail"}>
          {reset ? "New password" : "Email"}
        </label>
        <input
          id={reset ? "newPassword" : "recoveryEmail"}
          name={reset ? "password" : "email"}
          type={reset ? "password" : "email"}
          autoComplete={reset ? "new-password" : "email"}
          required
          minLength={reset ? 12 : undefined}
        />
      </div>
      <button className="button primary" disabled={busy}>
        {busy
          ? "Please wait…"
          : reset
            ? "Update password"
            : "Send recovery email"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
