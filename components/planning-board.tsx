"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type DragEvent } from "react";
import {
  assignEmployeeToSlotAction,
  createShiftSlotAction,
  deleteShiftAction,
  deleteShiftSlotAction,
  updateAssignmentTimesAction,
} from "@/modules/manager/actions";
import type {
  BoardAssignment,
  BoardDay,
  BoardEmployee,
  BoardSlot,
} from "@/lib/planning";

export type {
  BoardAssignment,
  BoardDay,
  BoardEmployee,
  BoardSlot,
} from "@/lib/planning";

function EmployeeChip({
  employee,
  draggable = true,
}: {
  employee: BoardEmployee;
  draggable?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/employee-id", employee.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="cursor-grab rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 shadow-sm active:cursor-grabbing"
    >
      <span>{employee.name}</span>
      {employee.jobTitle ? (
        <span className="mt-0.5 block text-xs font-normal text-zinc-500">
          {employee.jobTitle}
        </span>
      ) : null}
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: BoardAssignment }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">{assignment.userName}</p>
          <p className="text-xs text-zinc-600">
            {assignment.startTime} → {assignment.endTime}
            {assignment.adjusted ? (
              <span className="ml-1 text-amber-700">(ajusté)</span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="text-xs text-zinc-600 hover:underline"
            onClick={() => setEditing((v) => !v)}
          >
            Ajuster
          </button>
          <button
            type="button"
            disabled={pending}
            className="text-xs text-rose-700 hover:underline disabled:opacity-60"
            onClick={() =>
              startTransition(async () => {
                await deleteShiftAction(assignment.id);
                router.refresh();
              })
            }
          >
            Retirer
          </button>
        </div>
      </div>

      {editing ? (
        <form
          className="mt-2 space-y-2 border-t border-emerald-100 pt-2"
          action={(fd) => {
            fd.set("id", assignment.id);
            setError(null);
            startTransition(async () => {
              const result = await updateAssignmentTimesAction(fd);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setEditing(false);
              router.refresh();
            });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              name="startTime"
              type="time"
              required
              defaultValue={assignment.startTime}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            />
            <input
              name="endTime"
              type="time"
              required
              defaultValue={assignment.endTime}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            />
          </div>
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
          >
            Enregistrer
          </button>
        </form>
      ) : null}
    </div>
  );
}

function SlotDropZone({ slot }: { slot: BoardSlot }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    const userId = e.dataTransfer.getData("text/employee-id");
    if (!userId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignEmployeeToSlotAction(slot.id, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`min-h-28 rounded-xl border border-dashed p-2 transition ${
        over
          ? "border-zinc-900 bg-zinc-100"
          : "border-zinc-200 bg-zinc-50/80"
      } ${pending ? "opacity-70" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{slot.name}</p>
          <p className="text-xs text-zinc-500">
            {slot.startTime} → {slot.endTime}
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-rose-600 hover:underline"
          onClick={() =>
            startTransition(async () => {
              await deleteShiftSlotAction(slot.id);
              router.refresh();
            })
          }
        >
          Suppr.
        </button>
      </div>
      <div className="space-y-2">
        {slot.assignments.map((a) => (
          <AssignmentCard key={a.id} assignment={a} />
        ))}
        {slot.assignments.length === 0 ? (
          <p className="py-3 text-center text-xs text-zinc-400">
            Glisser un employé ici
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function CreateSlotForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recurring, setRecurring] = useState(false);

  const weekDays = [
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mer" },
    { value: 4, label: "Jeu" },
    { value: 5, label: "Ven" },
    { value: 6, label: "Sam" },
    { value: 7, label: "Dim" },
  ];

  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      action={(fd) => {
        setError(null);
        setSuccess(null);
        if (recurring) fd.set("recurring", "1");
        startTransition(async () => {
          const result = await createShiftSlotAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSuccess(
            recurring
              ? "Créneaux récurrents créés."
              : "Créneau créé.",
          );
          router.refresh();
        });
      }}
    >
      <h2 className="font-semibold text-zinc-900">Nouveau créneau</h2>
      <p className="text-xs text-zinc-500">
        Horaires d’ouverture du service (Midi, Soir…)
      </p>
      <input
        name="name"
        required
        placeholder="Ex. Midi"
        defaultValue="Midi"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <div>
        <label className="mb-1 block text-xs text-zinc-500" htmlFor="slot-date">
          {recurring ? "À partir du" : "Date"}
        </label>
        <input
          id="slot-date"
          name="date"
          type="date"
          required
          defaultValue={defaultDate}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
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

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="rounded border-zinc-300"
        />
        Créneau récurrent
      </label>

      {recurring ? (
        <div className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600">Jours</p>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((d) => (
                <label
                  key={d.value}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={d.value}
                    defaultChecked={d.value >= 1 && d.value <= 5}
                    className="rounded border-zinc-300"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label
              className="mb-1 block text-xs text-zinc-500"
              htmlFor="weeksCount"
            >
              Pendant (semaines)
            </label>
            <input
              id="weeksCount"
              name="weeksCount"
              type="number"
              min={1}
              max={12}
              defaultValue={4}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}

      <input
        name="notes"
        placeholder="Notes (optionnel)"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending
          ? "Création…"
          : recurring
            ? "Créer les créneaux"
            : "Créer le créneau"}
      </button>
    </form>
  );
}

export function PlanningBoard({
  employees,
  days,
}: {
  employees: BoardEmployee[];
  days: BoardDay[];
}) {
  const assignedIds = new Set(
    days.flatMap((d) => d.slots.flatMap((s) => s.assignments.map((a) => a.userId))),
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Employés — glisser vers un créneau
        </p>
        <div className="flex flex-wrap gap-2">
          {employees.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun employé actif.</p>
          ) : (
            employees.map((e) => <EmployeeChip key={e.id} employee={e} />)
          )}
        </div>
        {assignedIds.size > 0 ? (
          <p className="mt-2 text-xs text-zinc-400">
            Un employé peut être placé dans plusieurs créneaux.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold capitalize text-zinc-900">
              {day.label}
            </h3>
            <div className="space-y-3">
              {day.slots.length === 0 ? (
                <p className="text-xs text-zinc-400">Aucun créneau ce jour.</p>
              ) : (
                day.slots.map((slot) => (
                  <SlotDropZone key={slot.id} slot={slot} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
