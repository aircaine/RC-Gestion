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
      include: {
        user: true,
        validatedBy: { select: { name: true } },
      },
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
    <div className="rc-page">
      <ManagerNav current="heures" />
      <main className="rc-main mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Heures
            </h1>
            <p className="text-sm text-muted">
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
          className="flex flex-wrap items-end gap-3 rc-panel p-4"
        >
          <input type="hidden" name="status" value={statusFilter} />
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="from">
              Du
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromStr}
              className="rc-input w-auto text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="to">
              Au
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toStr}
              className="rc-input w-auto text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted" htmlFor="userId">
              Employé
            </label>
            <select
              id="userId"
              name="userId"
              defaultValue={userId ?? ""}
              className="rc-input w-auto text-sm"
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
            className="rc-btn rc-btn-primary"
          >
            Filtrer
          </button>
        </form>

        {pastItems.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-semibold text-ink">
              Services passés à valider ({pastItems.length})
            </h2>
            {pastItems.map((item) => (
              <PastAssignmentCard key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-ink">Déclarations</h2>
            <div className="flex flex-wrap gap-1">
              {filters.map((f) => (
                <a
                  key={f.key}
                  href={`/manager/heures?status=${f.key}${querySuffix}`}
                  className={`rounded-md px-2.5 py-1 text-sm ${
                    statusFilter === f.key
                      ? "bg-forest text-white"
                      : "bg-surface text-muted ring-1 ring-line hover:bg-paper"
                  }`}
                >
                  {f.label}
                </a>
              ))}
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-muted">
              Aucune déclaration sur cette période.
            </p>
          ) : (
            entries.map((e) => (
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
                  managerNote: e.managerNote,
                  validatedByName: e.validatedBy?.name ?? null,
                  status: e.status,
                }}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}
