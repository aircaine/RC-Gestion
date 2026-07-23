"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { declareHoursAction } from "@/modules/time-tracking/actions";

type ShiftOption = {
  id: string;
  label: string;
};

export function DeclareHoursForm({ shifts }: { shifts: ShiftOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await declareHoursAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">
        Déclarer mes heures
      </h2>
      <p className="text-sm text-zinc-500">
        Après le service (ou le lendemain), indiquez début et fin. Le manager
        confirmera.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={today}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="startTime">
            Début
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue="11:00"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="endTime">
            Fin
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue="15:00"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="shiftId">
          Shift planifié (optionnel)
        </label>
        <select
          id="shiftId"
          name="shiftId"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          defaultValue="none"
        >
          <option value="none">Hors planning</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="employeeNote">
          Note (optionnel)
        </label>
        <textarea
          id="employeeNote"
          name="employeeNote"
          rows={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="Ex. service prolongé"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Déclaration envoyée — en attente de confirmation.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer la déclaration"}
      </button>
    </form>
  );
}
