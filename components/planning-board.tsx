"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState, useTransition, type DragEvent } from "react";
import {
  assignEmployeeToSlotAction,
  createShiftSlotAction,
  deleteShiftAction,
  deleteShiftSlotAction,
  updateAssignmentTimesAction,
} from "@/modules/manager/actions";

export type BoardEmployee = { id: string; name: string };

export type BoardAssignment = {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  adjusted: boolean;
};

export type BoardSlot = {
  id: string;
  name: string;
  dateKey: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  assignments: BoardAssignment[];
};

export type BoardDay = {
  dateKey: string;
  label: string;
  slots: BoardSlot[];
};

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
      {employee.name}
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

  return (
    <form
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const result = await createShiftSlotAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
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
      <input
        name="date"
        type="date"
        required
        defaultValue={defaultDate}
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
        {pending ? "Création…" : "Créer le créneau"}
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

/** Helper for server pages to format times consistently */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE d MMM", { locale: fr });
}
