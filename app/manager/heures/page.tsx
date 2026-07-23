import { redirect } from "next/navigation";
import { format } from "date-fns";
import type { TimeEntryStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateHours } from "@/modules/time-tracking/hours";
import { ManagerNav } from "@/components/nav";
import {
  ConfirmAllPastAssignmentsButton,
  ConfirmAllPendingButton,
  PastAssignmentCard,
  TimeEntryReviewCard,
} from "@/components/time-entry-review";
import { StatusBadge, HoursLabel } from "@/components/status-badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  userId?: string;
  from?: string;
  to?: string;
}>;

const VALID_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "ADJUSTED",
  "REJECTED",
]);

export default async function ManagerHeuresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/heures");

  const params = await searchParams;
  const statusFilter = params.status ?? "PENDING";
  const userId = params.userId;

  const now = new Date();
  const defaultFrom = format(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
    "yyyy-MM-dd",
  );
  const defaultTo = format(now, "yyyy-MM-dd");
  const fromStr = params.from ?? defaultFrom;
  const toStr = params.to ?? defaultTo;
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T23:59:59`);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const statusWhere =
    statusFilter !== "ALL" && VALID_STATUSES.has(statusFilter)
      ? { status: statusFilter as TimeEntryStatus }
      : {};

  const [entries, pastAssignments] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        ...statusWhere,
        ...(userId ? { userId } : {}),
        startedAt: { gte: from, lte: to },
      },
      include: { user: true },
      orderBy: { startedAt: "desc" },
      take: 150,
    }),
    prisma.shift.findMany({
      where: {
        endsAt: { gte: from, lte: now < to ? now : to },
        ...(userId ? { userId } : {}),
        timeEntries: {
          none: {
            status: { in: ["PENDING", "CONFIRMED", "ADJUSTED"] },
          },
        },
      },
      include: {
        user: { select: { name: true } },
        slot: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 80,
    }),
  ]);

  const pendingIds = entries
    .filter((e) => e.status === "PENDING")
    .map((e) => e.id);

  const pastItems = pastAssignments.map((a) => {
    let hours = 0;
    try {
      hours = calculateHours(a.startsAt, a.endsAt);
    } catch {
      hours = 0;
    }
    return {
      id: a.id,
      employeeName: a.user.name,
      slotName: a.slot.name,
      date: format(a.startsAt, "yyyy-MM-dd"),
      startTime: format(a.startsAt, "HH:mm"),
      endTime: format(a.endsAt, "HH:mm"),
      hours,
    };
  });

  const filters = [
    { key: "PENDING", label: "En attente" },
    { key: "CONFIRMED", label: "Confirmées" },
    { key: "ADJUSTED", label: "Ajustées" },
    { key: "REJECTED", label: "Rejetées" },
    { key: "ALL", label: "Toutes" },
  ];

  const querySuffix = `${userId ? `&userId=${userId}` : ""}&from=${fromStr}&to=${toStr}`;

  return (
    <div className="min-h-full bg-zinc-50">
      <ManagerNav current="heures" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Confirmer les heures
            </h1>
            <p className="text-sm text-zinc-500">
              Validez les heures déclarées ou les services passés du planning.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ConfirmAllPendingButton ids={pendingIds} />
            <ConfirmAllPastAssignmentsButton
              ids={pastItems.map((p) => p.id)}
            />
          </div>
        </div>

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="status" value={statusFilter} />
          <div>
            <label className="mb-1 block text-xs text-zinc-500" htmlFor="from">
              Du
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromStr}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500" htmlFor="to">
              Au
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toStr}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500" htmlFor="userId">
              Employé
            </label>
            <select
              id="userId"
              name="userId"
              defaultValue={userId ?? ""}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Filtrer
          </button>
        </form>

        {pastItems.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-semibold text-zinc-900">
              Services passés à valider ({pastItems.length})
            </h2>
            {pastItems.map((item) => (
              <PastAssignmentCard key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-zinc-900">Déclarations</h2>
            <div className="flex flex-wrap gap-1">
              {filters.map((f) => (
                <a
                  key={f.key}
                  href={`/manager/heures?status=${f.key}${querySuffix}`}
                  className={`rounded-md px-2.5 py-1 text-sm ${
                    statusFilter === f.key
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {f.label}
                </a>
              ))}
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune déclaration sur cette période.
            </p>
          ) : (
            entries.map((e) =>
              e.status === "PENDING" ? (
                <TimeEntryReviewCard
                  key={e.id}
                  entry={{
                    id: e.id,
                    date: format(e.startedAt, "yyyy-MM-dd"),
                    startTime: format(e.startedAt, "HH:mm"),
                    endTime: format(e.endedAt, "HH:mm"),
                    hours: e.hours,
                    employeeName: e.user.name,
                    employeeNote: e.employeeNote,
                    status: e.status,
                  }}
                />
              ) : (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{e.user.name}</p>
                    <p className="text-sm text-zinc-600">
                      {format(e.startedAt, "yyyy-MM-dd")} ·{" "}
                      {format(e.startedAt, "HH:mm")} →{" "}
                      {format(e.endedAt, "HH:mm")} ·{" "}
                      <HoursLabel hours={e.hours} />
                    </p>
                    {e.managerNote ? (
                      <p className="text-xs text-zinc-500">
                        Manager : {e.managerNote}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ),
            )
          )}
        </section>
      </main>
    </div>
  );
}
