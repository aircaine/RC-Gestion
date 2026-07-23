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
    <form action={onSubmit} className="space-y-4 rc-panel p-4">
      <h2 className="text-base font-semibold text-ink">
        Déclarer mes heures
      </h2>
      <p className="text-sm text-muted">
        Après le service (ou le lendemain), indiquez début et fin. Le manager
        confirmera.
      </p>

      <div>
        <label className="rc-label" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={today}
          className="rc-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rc-label" htmlFor="startTime">
            Début
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            defaultValue="11:00"
            className="rc-input"
          />
        </div>
        <div>
          <label className="rc-label" htmlFor="endTime">
            Fin
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            defaultValue="15:00"
            className="rc-input"
          />
        </div>
      </div>

      <div>
        <label className="rc-label" htmlFor="shiftId">
          Shift planifié (optionnel)
        </label>
        <select
          id="shiftId"
          name="shiftId"
          className="rc-input"
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
        <label className="rc-label" htmlFor="employeeNote">
          Note (optionnel)
        </label>
        <textarea
          id="employeeNote"
          name="employeeNote"
          rows={2}
          className="rc-input"
          placeholder="Ex. service prolongé"
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-[var(--rose-soft)] px-3 py-2 text-sm text-[#8f2f2f]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-forest-soft px-3 py-2 text-sm text-forest">
          Déclaration envoyée — en attente de confirmation.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rc-btn rc-btn-primary w-full py-2.5"
      >
        {pending ? "Envoi…" : "Envoyer la déclaration"}
      </button>
    </form>
  );
}
