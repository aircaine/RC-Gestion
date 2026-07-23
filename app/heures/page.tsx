import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmployeeHeader } from "@/components/nav";
import { DeclareHoursForm } from "@/components/declare-hours-form";
import { HoursLabel, StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function HeuresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "MANAGER") redirect("/manager");

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 14);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);

  const [shifts, entries] = await Promise.all([
    prisma.shift.findMany({
      where: {
        userId: session.user.id,
        startsAt: { gte: from, lte: to },
      },
      include: { slot: { select: { name: true } } },
      orderBy: { startsAt: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        startedAt: { gte: from },
      },
      orderBy: { startedAt: "desc" },
      take: 40,
    }),
  ]);

  const confirmedHours = entries
    .filter((e) => e.status === "CONFIRMED" || e.status === "ADJUSTED")
    .reduce((sum, e) => sum + e.hours, 0);

  const shiftOptions = shifts.map((s) => ({
    id: s.id,
    label: `${s.slot.name} · ${format(s.startsAt, "EEE d MMM HH:mm", { locale: fr })} → ${format(s.endsAt, "HH:mm")}`,
  }));

  return (
    <div className="rc-page">
      <EmployeeHeader name={session.user.name ?? "Employé"} />
      <main className="rc-main mx-auto max-w-lg space-y-6 px-4 py-8">
        <section className="rc-panel p-4">
          <p className="text-sm text-muted">Heures confirmées (14 j.)</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            <HoursLabel hours={confirmedHours} />
          </p>
        </section>

        {shifts.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-medium text-ink">
              Shifts assignés
            </h2>
            <ul className="space-y-2">
              {shifts.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted"
                >
                  <span className="font-medium text-ink">{s.slot.name}</span>
                  {" · "}
                  {format(s.startsAt, "EEEE d MMMM · HH:mm", { locale: fr })} →{" "}
                  {format(s.endsAt, "HH:mm")}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <DeclareHoursForm shifts={shiftOptions} />

        <section>
          <h2 className="mb-2 text-sm font-medium text-ink">Historique</h2>
          <ul className="space-y-2">
            {entries.length === 0 ? (
              <li className="text-sm text-muted">Aucune déclaration.</li>
            ) : (
              entries.map((e) => (
                <li
                  key={e.id}
                  className="rc-panel flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {format(e.startedAt, "d MMM yyyy", { locale: fr })} ·{" "}
                      {format(e.startedAt, "HH:mm")}–{format(e.endedAt, "HH:mm")}
                    </p>
                    <p className="text-xs text-muted">
                      <HoursLabel hours={e.hours} /> ·{" "}
                      {e.source === "SCHEDULED" ? "Planifié" : "Hors planning"}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
