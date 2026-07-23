"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adjustTimeEntryAction,
  confirmAllPastAssignmentsAction,
  confirmAllPendingAction,
  confirmPastAssignmentAction,
  confirmTimeEntryAction,
  rejectTimeEntryAction,
} from "@/modules/time-tracking/actions";

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  employeeName: string;
  employeeNote: string | null;
  status: string;
};

export function TimeEntryReviewCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdjust, setShowAdjust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowAdjust(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900">{entry.employeeName}</p>
          <p className="text-sm text-zinc-600">
            {entry.date} · {entry.startTime} → {entry.endTime} ·{" "}
            <span className="font-medium">{entry.hours}h</span>
          </p>
          {entry.employeeNote ? (
            <p className="mt-1 text-sm text-zinc-500">Note : {entry.employeeNote}</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {entry.status === "PENDING" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => confirmTimeEntryAction(entry.id))}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            Confirmer
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowAdjust((v) => !v)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            Corriger
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => rejectTimeEntryAction(entry.id, rejectNote))
            }
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Rejeter
          </button>
          <input
            type="text"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Motif rejet (optionnel)"
            className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
      ) : null}

      {showAdjust ? (
        <form
          className="mt-3 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3"
          action={(fd) => {
            fd.set("id", entry.id);
            run(() => adjustTimeEntryAction(fd));
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            <input
              name="date"
              type="date"
              required
              defaultValue={entry.date}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              name="startTime"
              type="time"
              required
              defaultValue={entry.startTime}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              name="endTime"
              type="time"
              required
              defaultValue={entry.endTime}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <input
            name="managerNote"
            type="text"
            placeholder="Note manager"
            className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
          >
            Enregistrer l&apos;ajustement
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function ConfirmAllPendingButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (ids.length === 0) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await confirmAllPendingAction(ids);
          router.refresh();
        })
      }
      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
    >
      {pending ? "Confirmation…" : `Tout confirmer (${ids.length})`}
    </button>
  );
}

type PastAssignment = {
  id: string;
  employeeName: string;
  slotName: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
};

export function PastAssignmentCard({ item }: { item: PastAssignment }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">{item.employeeName}</p>
          <p className="text-sm text-zinc-600">
            {item.slotName} · {item.date} · {item.startTime} → {item.endTime} ·{" "}
            <span className="font-medium">{item.hours}h</span>
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Service passé sans déclaration — valider selon le planning
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await confirmPastAssignmentAction(item.id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            })
          }
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "…" : "Confirmer les heures"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}

export function ConfirmAllPastAssignmentsButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (ids.length === 0) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await confirmAllPastAssignmentsAction(ids);
          router.refresh();
        })
      }
      className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
    >
      {pending ? "Validation…" : `Valider tout le planning passé (${ids.length})`}
    </button>
  );
}
