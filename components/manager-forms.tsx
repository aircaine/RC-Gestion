"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createEmployeeAction,
  resendEmployeeInviteAction,
  toggleEmployeeActiveAction,
  updateEmployeeJobTitleAction,
} from "@/modules/manager/actions";

export function CreateEmployeeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="space-y-3 rc-panel p-4"
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
      <h2 className="font-semibold text-ink">Inviter un employé</h2>
      <p className="text-xs text-muted">
        Un e-mail lui sera envoyé pour créer son mot de passe.
      </p>
      <input
        name="firstName"
        required
        placeholder="Prénom"
        className="rc-input text-sm"
      />
      <input
        name="lastName"
        required
        placeholder="Nom"
        className="rc-input text-sm"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="rc-input text-sm"
      />
      <input
        name="jobTitle"
        placeholder="Rôle (ex. Serveur, Cuisinier…)"
        className="rc-input text-sm"
      />
      {error ? <p className="text-sm text-[#8f2f2f]">{error}</p> : null}
      {success ? (
        <p className="text-sm text-forest">
          Invitation envoyée par e-mail.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rc-btn rc-btn-primary"
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
        className="rc-btn rc-btn-ghost border border-line text-xs disabled:opacity-60"
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
      className="rc-btn rc-btn-ghost border border-line text-xs disabled:opacity-60"
    >
      {active ? "Désactiver" : "Activer"}
    </button>
  );
}

export function EditJobTitleForm({
  id,
  jobTitle,
}: {
  id: string;
  jobTitle: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-1"
      action={(fd) => {
        fd.set("id", id);
        startTransition(async () => {
          await updateEmployeeJobTitleAction(fd);
          router.refresh();
        });
      }}
    >
      <input
        name="jobTitle"
        defaultValue={jobTitle ?? ""}
        placeholder="Rôle"
        className="w-full min-w-[8rem] rounded-md border border-line px-2 py-1 text-xs text-ink"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted hover:bg-paper disabled:opacity-60"
      >
        OK
      </button>
    </form>
  );
}
