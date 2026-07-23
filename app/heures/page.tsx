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
    label: `${format(s.startsAt, "EEE d MMM HH:mm", { locale: fr })} → ${format(s.endsAt, "HH:mm")}${s.notes ? ` (${s.notes})` : ""}`,
  }));

  return (
    <div className="min-h-full bg-zinc-50">
      <EmployeeHeader name={session.user.name ?? "Employé"} />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Heures confirmées (14 j.)</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            <HoursLabel hours={confirmedHours} />
          </p>
        </section>

        {shifts.length > 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-medium text-zinc-700">
              Shifts assignés
            </h2>
            <ul className="space-y-2">
              {shifts.slice(0, 5).map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
                >
                  {format(s.startsAt, "EEEE d MMMM · HH:mm", { locale: fr })} →{" "}
                  {format(s.endsAt, "HH:mm")}
                  {s.notes ? (
                    <span className="text-zinc-400"> — {s.notes}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <DeclareHoursForm shifts={shiftOptions} />

        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-700">Historique</h2>
          <ul className="space-y-2">
            {entries.length === 0 ? (
              <li className="text-sm text-zinc-500">Aucune déclaration.</li>
            ) : (
              entries.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {format(e.startedAt, "d MMM yyyy", { locale: fr })} ·{" "}
                      {format(e.startedAt, "HH:mm")}–{format(e.endedAt, "HH:mm")}
                    </p>
                    <p className="text-xs text-zinc-500">
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
