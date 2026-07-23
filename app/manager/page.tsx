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
    <div className="rc-page">
      <ManagerNav current="dashboard" />
      <main className="rc-main mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <p className="text-sm text-muted">
            Bienvenue, {session.user.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            Dashboard
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rc-panel p-5">
            <p className="text-sm text-muted">En attente de confirmation</p>
            <p className="mt-2 font-display text-4xl font-semibold text-copper">
              {pendingCount}
            </p>
            <Link
              href="/manager/heures"
              className="mt-3 inline-block text-sm font-medium text-forest underline-offset-2 hover:underline"
            >
              Confirmer les heures →
            </Link>
          </div>
          <div className="rc-panel p-5">
            <p className="text-sm text-muted">Heures du mois</p>
            <p className="mt-2 font-display text-4xl font-semibold text-ink">
              <HoursLabel hours={monthHours} />
            </p>
          </div>
          <div className="rc-panel p-5">
            <p className="text-sm text-muted">Employés actifs</p>
            <p className="mt-2 font-display text-4xl font-semibold text-ink">
              {employeeCount}
            </p>
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">
              Déclarations à confirmer
            </h2>
            <Link
              href="/manager/heures"
              className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Tout voir
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">Aucune déclaration en attente.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((e) => (
                <li
                  key={e.id}
                  className="rc-panel flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-ink">{e.user.name}</p>
                    <p className="text-sm text-muted">
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

        <section className="rounded-2xl border border-dashed border-line bg-surface/70 p-5">
          <p className="text-sm font-medium text-ink">Modules</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            <li className="rounded-lg bg-forest px-2.5 py-1 text-white">
              Heures
            </li>
            <li className="rounded-lg bg-paper-deep px-2.5 py-1 text-muted">
              Stocks (bientôt)
            </li>
            <li className="rounded-lg bg-paper-deep px-2.5 py-1 text-muted">
              Caisse (bientôt)
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
