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
      className="cursor-grab rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink shadow-sm active:cursor-grabbing"
    >
      <span>{employee.name}</span>
      {employee.jobTitle ? (
        <span className="mt-0.5 block text-xs font-normal text-muted">
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
    <div className="rounded-xl border border-forest/20 bg-forest-soft/80 p-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{assignment.userName}</p>
          <p className="text-xs text-muted">
            {assignment.startTime} → {assignment.endTime}
            {assignment.adjusted ? (
              <span className="ml-1 text-copper">(ajusté)</span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="text-xs text-muted hover:underline"
            onClick={() => setEditing((v) => !v)}
          >
            Ajuster
          </button>
          <button
            type="button"
            disabled={pending}
            className="text-xs text-[#8f2f2f] hover:underline disabled:opacity-60"
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
          className="mt-2 space-y-2 border-t border-forest/15 pt-2"
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
              className="rounded-md border border-line px-2 py-1 text-xs"
            />
            <input
              name="endTime"
              type="time"
              required
              defaultValue={assignment.endTime}
              className="rounded-md border border-line px-2 py-1 text-xs"
            />
          </div>
          {error ? <p className="text-xs text-[#8f2f2f]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rc-btn rc-btn-primary px-2 py-1 text-xs"
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
          ? "border-forest bg-paper-deep"
          : "border-line bg-paper/80"
      } ${pending ? "opacity-70" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{slot.name}</p>
          <p className="text-xs text-muted">
            {slot.startTime} → {slot.endTime}
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-[#8f2f2f] hover:underline"
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
          <p className="py-3 text-center text-xs text-muted">
            Glisser un employé ici
          </p>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-[#8f2f2f]">{error}</p> : null}
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
      className="space-y-3 rc-panel p-4"
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
      <h2 className="font-semibold text-ink">Nouveau créneau</h2>
      <p className="text-xs text-muted">
        Horaires d’ouverture du service (Midi, Soir…)
      </p>
      <input
        name="name"
        required
        placeholder="Ex. Midi"
        defaultValue="Midi"
        className="rc-input text-sm"
      />
      <div>
        <label className="mb-1 block text-xs text-muted" htmlFor="slot-date">
          {recurring ? "À partir du" : "Date"}
        </label>
        <input
          id="slot-date"
          name="date"
          type="date"
          required
          defaultValue={defaultDate}
          className="rc-input text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          name="startTime"
          type="time"
          required
          defaultValue="11:00"
          className="rc-input w-auto text-sm"
        />
        <input
          name="endTime"
          type="time"
          required
          defaultValue="15:00"
          className="rc-input w-auto text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="rounded border-line"
        />
        Créneau récurrent
      </label>

      {recurring ? (
        <div className="space-y-3 rounded-lg border border-line/60 bg-paper p-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Jours</p>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((d) => (
                <label
                  key={d.value}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={d.value}
                    defaultChecked={d.value >= 1 && d.value <= 5}
                    className="rounded border-line"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label
              className="mb-1 block text-xs text-muted"
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
              className="rc-input text-sm"
            />
          </div>
        </div>
      ) : null}

      <input
        name="notes"
        placeholder="Notes (optionnel)"
        className="rc-input text-sm"
      />
      {error ? <p className="text-sm text-[#8f2f2f]">{error}</p> : null}
      {success ? <p className="text-sm text-forest">{success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rc-btn rc-btn-primary"
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
      <div className="rc-panel p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Employés — glisser vers un créneau
        </p>
        <div className="flex flex-wrap gap-2">
          {employees.length === 0 ? (
            <p className="text-sm text-muted">Aucun employé actif.</p>
          ) : (
            employees.map((e) => <EmployeeChip key={e.id} employee={e} />)
          )}
        </div>
        {assignedIds.size > 0 ? (
          <p className="mt-2 text-xs text-muted">
            Un employé peut être placé dans plusieurs créneaux.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className="rc-panel p-3"
          >
            <h3 className="mb-3 text-sm font-semibold capitalize text-ink">
              {day.label}
            </h3>
            <div className="space-y-3">
              {day.slots.length === 0 ? (
                <p className="text-xs text-muted">Aucun créneau ce jour.</p>
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
