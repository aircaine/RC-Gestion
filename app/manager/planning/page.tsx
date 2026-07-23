import { redirect } from "next/navigation";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import {
  CreateShiftForm,
  DeleteShiftButton,
} from "@/components/manager-forms";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/heures");

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  // Show a wider window: past week + next 2 weeks
  const from = new Date(weekStart);
  from.setDate(from.getDate() - 7);
  const to = new Date(weekEnd);
  to.setDate(to.getDate() + 14);

  const [employees, shifts] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shift.findMany({
      where: { startsAt: { gte: from, lte: to } },
      include: { user: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <div className="min-h-full bg-zinc-50">
      <ManagerNav current="planning" />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Planning
          </h1>
          <p className="mb-4 text-sm text-zinc-500">
            Semaine du {format(weekStart, "d MMM", { locale: fr })} — assignation
            des shifts
          </p>
          <ul className="space-y-2">
            {shifts.length === 0 ? (
              <li className="text-sm text-zinc-500">Aucun shift sur la période.</li>
            ) : (
              shifts.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{s.user.name}</p>
                    <p className="text-sm text-zinc-600">
                      {format(s.startsAt, "EEEE d MMM · HH:mm", { locale: fr })} →{" "}
                      {format(s.endsAt, "HH:mm")}
                      {s.notes ? (
                        <span className="text-zinc-400"> — {s.notes}</span>
                      ) : null}
                    </p>
                  </div>
                  <DeleteShiftButton id={s.id} />
                </li>
              ))
            )}
          </ul>
        </section>
        <CreateShiftForm employees={employees} />
      </main>
    </div>
  );
}
