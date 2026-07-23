import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import { HoursLabel, StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/heures");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [pendingCount, pending, confirmedMonth, employeeCount] =
    await Promise.all([
      prisma.timeEntry.count({ where: { status: "PENDING" } }),
      prisma.timeEntry.findMany({
        where: { status: "PENDING" },
        include: { user: true },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
      prisma.timeEntry.findMany({
        where: {
          status: { in: ["CONFIRMED", "ADJUSTED"] },
          startedAt: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.user.count({ where: { role: "EMPLOYEE", active: true } }),
    ]);

  const monthHours = confirmedMonth.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="min-h-full bg-zinc-50">
      <ManagerNav current="dashboard" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Bienvenue, {session.user.name}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">En attente</p>
            <p className="mt-1 text-3xl font-semibold text-amber-700">
              {pendingCount}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Heures du mois</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">
              <HoursLabel hours={monthHours} />
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">Employés actifs</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">
              {employeeCount}
            </p>
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">
              Déclarations à confirmer
            </h2>
            <Link
              href="/manager/heures"
              className="text-sm text-zinc-600 underline-offset-2 hover:underline"
            >
              Tout voir
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune déclaration en attente.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{e.user.name}</p>
                    <p className="text-sm text-zinc-600">
                      {format(e.startedAt, "d MMM yyyy HH:mm", { locale: fr })} →{" "}
                      {format(e.endedAt, "HH:mm")} ·{" "}
                      <HoursLabel hours={e.hours} />
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-dashed border-zinc-300 bg-white/60 p-4">
          <p className="text-sm font-medium text-zinc-700">Modules</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            <li className="rounded-md bg-zinc-900 px-2.5 py-1 text-white">
              Heures
            </li>
            <li className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-400">
              Stocks (bientôt)
            </li>
            <li className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-400">
              Caisse (bientôt)
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
