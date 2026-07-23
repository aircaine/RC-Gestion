"use client";

import { useActionState } from "react";
import { loginAction } from "@/modules/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="rc-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rc-input"
          placeholder="vous@restaurant.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="rc-label">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rc-input"
        />
      </div>
      {state?.error ? (
        <p className="rounded-xl bg-[var(--rose-soft)] px-3 py-2.5 text-sm text-[#8f2f2f]">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rc-btn rc-btn-primary w-full py-2.5"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
