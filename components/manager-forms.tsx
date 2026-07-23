"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createEmployeeAction,
  createShiftAction,
  deleteShiftAction,
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
      <h2 className="font-semibold text-zinc-900">Nouvel employé</h2>
      <input
        name="name"
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
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Mot de passe (6+)"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {error ? (
        <p className="text-sm text-rose-700">{error}</p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-700">Employé créé.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer"}
      </button>
    </form>
  );
}

export function ToggleEmployeeButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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

export function CreateShiftForm({
  employees,
}: {
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const result = await createShiftAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <h2 className="font-semibold text-zinc-900">Assigner un shift</h2>
      <select
        name="userId"
        required
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        defaultValue=""
      >
        <option value="" disabled>
          Employé
        </option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <input
        name="date"
        type="date"
        required
        defaultValue={today}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="startTime"
          type="time"
          required
          defaultValue="11:00"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          name="endTime"
          type="time"
          required
          defaultValue="15:00"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        name="notes"
        placeholder="Notes (optionnel)"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}

export function DeleteShiftButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteShiftAction(id);
          router.refresh();
        })
      }
      className="text-xs text-rose-700 hover:underline disabled:opacity-60"
    >
      Supprimer
    </button>
  );
}
