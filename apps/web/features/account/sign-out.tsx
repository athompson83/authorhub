"use client";
import { useActionState } from "react";
import { signOutAction } from "./actions";
export function SignOut() {
  const [state, action, pending] = useActionState(signOutAction, { error: "" });
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.dispatchEvent(
            new Event("authorhub:before-action", { cancelable: true }),
          )
        )
          event.preventDefault();
      }}
    >
      <button className="button" disabled={pending}>
        Sign out
      </button>
      {state.error && <span role="status">{state.error}</span>}
    </form>
  );
}
