"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptInviteAction } from "@/modules/manager/actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        fd.set("token", token);
        setError(null);
        startTransition(async () => {
          const result = await acceptInviteAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/login?activated=1");
          router.refresh();
        });
      }}
    >
      <div>
        <label htmlFor="password" className="rc-label">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rc-input"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="rc-label">
          Confirmer le mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rc-input"
        />
      </div>
      {error ? (
        <p className="rounded-xl bg-[var(--rose-soft)] px-3 py-2.5 text-sm text-[#8f2f2f]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rc-btn rc-btn-primary w-full py-2.5"
      >
        {pending ? "Activation…" : "Activer mon compte"}
      </button>
    </form>
  );
}
