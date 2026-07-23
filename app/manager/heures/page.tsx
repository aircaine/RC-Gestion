import { redirect } from "next/navigation";
import { format } from "date-fns";
import type { TimeEntryStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import { TimeEntryReviewCard } from "@/components/time-entry-review";
import { StatusBadge, HoursLabel } from "@/components/status-badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; userId?: string }>;

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

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const statusWhere =
    statusFilter !== "ALL" && VALID_STATUSES.has(statusFilter)
      ? { status: statusFilter as TimeEntryStatus }
      : {};

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...statusWhere,
      ...(userId ? { userId } : {}),
    },
    include: { user: true },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  const filters = [
    { key: "PENDING", label: "En attente" },
    { key: "CONFIRMED", label: "Confirmées" },
    { key: "ADJUSTED", label: "Ajustées" },
    { key: "REJECTED", label: "Rejetées" },
    { key: "ALL", label: "Toutes" },
  ];

  return (
    <div className="min-h-full bg-zinc-50">
      <ManagerNav current="heures" />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Heures
        </h1>

        <form className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <a
              key={f.key}
              href={`/manager/heures?status=${f.key}${userId ? `&userId=${userId}` : ""}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                statusFilter === f.key
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </a>
          ))}
        </form>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="status" value={statusFilter} />
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

        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune déclaration.</p>
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
                      {format(e.startedAt, "HH:mm")} → {format(e.endedAt, "HH:mm")}{" "}
                      · <HoursLabel hours={e.hours} />
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
        </div>
      </main>
    </div>
  );
}
