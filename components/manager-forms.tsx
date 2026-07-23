"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createEmployeeAction,
  resendEmployeeInviteAction,
  toggleEmployeeActiveAction,
} from "@/modules/manager/actions";

export function CreateEmployeeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      action={(fd) => {
        setError(null);
        setSuccess(false);
        startTransition(async () => {
          const result = await createEmployeeAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSuccess(true);
          router.refresh();
        });
      }}
    >
      <h2 className="font-semibold text-zinc-900">Inviter un employé</h2>
      <p className="text-xs text-zinc-500">
        Un e-mail lui sera envoyé pour créer son mot de passe.
      </p>
      <input
        name="firstName"
        required
        placeholder="Prénom"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <input
        name="lastName"
        required
        placeholder="Nom"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? (
        <p className="text-sm text-emerald-700">
          Invitation envoyée par e-mail.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer l’invitation"}
      </button>
    </form>
  );
}

export function ToggleEmployeeButton({
  id,
  active,
  pendingInvite,
}: {
  id: string;
  active: boolean;
  pendingInvite?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (pendingInvite) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resendEmployeeInviteAction(id);
            router.refresh();
          })
        }
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
      >
        Renvoyer l’invitation
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleEmployeeActiveAction(id);
          router.refresh();
        })
      }
      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
    >
      {active ? "Désactiver" : "Activer"}
    </button>
  );
}
