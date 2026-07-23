"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  adjustTimeEntryAction,
  confirmAllPastAssignmentsAction,
  confirmAllPendingAction,
  confirmPastAssignmentAction,
  confirmTimeEntryWithTimesAction,
  deleteTimeEntryAction,
  rejectTimeEntryAction,
} from "@/modules/time-tracking/actions";
import { StatusBadge } from "@/components/status-badge";

type Entry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  employeeName: string;
  employeeNote: string | null;
  managerNote?: string | null;
  validatedByName?: string | null;
  status: string;
};

export function TimeEntryReviewCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdjust, setShowAdjust] = useState(entry.status === "PENDING");
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
    <div className="rc-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{entry.employeeName}</p>
          <p className="text-sm text-muted">
            {entry.date} · {entry.startTime} → {entry.endTime} ·{" "}
            <span className="font-medium">{entry.hours}h</span>
          </p>
          {entry.employeeNote ? (
            <p className="mt-1 text-sm text-muted">Note : {entry.employeeNote}</p>
          ) : null}
          {entry.managerNote ? (
            <p className="mt-1 text-xs text-muted">
              Note manager : {entry.managerNote}
            </p>
          ) : null}
          {entry.validatedByName ? (
            <p className="mt-1 text-xs font-medium text-forest">
              Validé par {entry.validatedByName}
            </p>
          ) : null}
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {error ? (
        <p className="mt-2 rounded-xl bg-[var(--rose-soft)] px-3 py-2 text-sm text-[#8f2f2f]">
          {error}
        </p>
      ) : null}

      {entry.status === "PENDING" ? (
        <form
          className="mt-3 space-y-2 rounded-lg border border-line/60 bg-paper p-3"
          action={(fd) => {
            fd.set("id", entry.id);
            run(() => confirmTimeEntryWithTimesAction(fd));
          }}
        >
          <p className="text-xs font-medium text-muted">
            Ajuster si besoin, puis confirmer
          </p>
          <div className="grid grid-cols-3 gap-2">
            <input
              name="date"
              type="date"
              required
              defaultValue={entry.date}
              className="rc-input w-auto text-sm"
            />
            <input
              name="startTime"
              type="time"
              required
              defaultValue={entry.startTime}
              className="rc-input w-auto text-sm"
            />
            <input
              name="endTime"
              type="time"
              required
              defaultValue={entry.endTime}
              className="rc-input w-auto text-sm"
            />
          </div>
          <input
            name="managerNote"
            type="text"
            placeholder="Note manager (optionnel)"
            defaultValue={entry.managerNote ?? ""}
            className="w-full rc-input w-auto text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rc-btn rc-btn-primary py-1.5"
            >
              {pending ? "…" : "Confirmer"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() => rejectTimeEntryAction(entry.id, rejectNote))
              }
              className="rc-btn rc-btn-danger py-1.5"
            >
              Rejeter
            </button>
            <input
              type="text"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Motif rejet"
              className="min-w-[10rem] flex-1 rc-input w-auto text-sm"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Supprimer définitivement ces heures ?")) {
                  return;
                }
                run(() => deleteTimeEntryAction(entry.id));
              }}
              className="rc-btn rc-btn-danger py-1.5"
            >
              Supprimer
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowAdjust((v) => !v)}
              className="rc-btn rc-btn-ghost border border-line text-sm disabled:opacity-60"
            >
              Modifier
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Supprimer définitivement ces heures ?")) {
                  return;
                }
                run(() => deleteTimeEntryAction(entry.id));
              }}
              className="rc-btn rc-btn-danger py-1.5"
            >
              Supprimer
            </button>
          </div>

          {showAdjust ? (
            <form
              className="mt-3 space-y-2 rounded-lg border border-line/60 bg-paper p-3"
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
                  className="rc-input w-auto text-sm"
                />
                <input
                  name="startTime"
                  type="time"
                  required
                  defaultValue={entry.startTime}
                  className="rc-input w-auto text-sm"
                />
                <input
                  name="endTime"
                  type="time"
                  required
                  defaultValue={entry.endTime}
                  className="rc-input w-auto text-sm"
                />
              </div>
              <input
                name="managerNote"
                type="text"
                placeholder="Note manager"
                defaultValue={entry.managerNote ?? ""}
                className="w-full rc-input w-auto text-sm"
              />
              <button
                type="submit"
                disabled={pending}
                className="rc-btn rc-btn-primary py-1.5"
              >
                Enregistrer
              </button>
            </form>
          ) : null}
        </>
      )}
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
      className="rc-btn rc-btn-primary"
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
    <div className="rc-panel border-[var(--copper)]/30 bg-copper-soft/50 p-4">
      <div>
        <p className="font-medium text-ink">{item.employeeName}</p>
        <p className="text-sm text-muted">
          {item.slotName} · {item.hours}h planifiées
        </p>
        <p className="mt-1 text-xs text-copper">
          Service passé sans déclaration — ajustez si besoin puis validez
        </p>
      </div>

      <form
        className="mt-3 space-y-2"
        action={(fd) => {
          fd.set("shiftId", item.id);
          setError(null);
          startTransition(async () => {
            const result = await confirmPastAssignmentAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          <input
            name="date"
            type="date"
            required
            defaultValue={item.date}
            className="rc-input w-auto text-sm"
          />
          <input
            name="startTime"
            type="time"
            required
            defaultValue={item.startTime}
            className="rc-input w-auto text-sm"
          />
          <input
            name="endTime"
            type="time"
            required
            defaultValue={item.endTime}
            className="rc-input w-auto text-sm"
          />
        </div>
        <input
          name="managerNote"
          type="text"
          placeholder="Note manager (optionnel)"
          className="w-full rc-input w-auto text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rc-btn rc-btn-primary py-1.5"
        >
          {pending ? "…" : "Confirmer les heures"}
        </button>
      </form>

      {error ? <p className="mt-2 text-sm text-[#8f2f2f]">{error}</p> : null}
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
      className="rc-btn rc-btn-secondary"
    >
      {pending ? "Validation…" : `Valider tout le planning passé (${ids.length})`}
    </button>
  );
}
