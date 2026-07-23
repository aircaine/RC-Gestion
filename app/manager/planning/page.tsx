import { redirect } from "next/navigation";
import {
  addDays,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import { CreateSlotForm, PlanningBoard } from "@/components/planning-board";
import {
  formatDayLabel,
  formatTime,
  type BoardDay,
} from "@/lib/planning";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ week?: string }>;

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/heures");

  const params = await searchParams;
  const base = params.week ? new Date(`${params.week}T12:00:00`) : new Date();
  const weekStart = startOfWeek(base, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(base, { weekStartsOn: 1 });
  const prevWeek = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const nextWeek = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const daysRange = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [employees, slots] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
        active: true,
        passwordHash: { not: null },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shiftSlot.findMany({
      where: {
        startsAt: { gte: weekStart, lte: addDays(weekEnd, 1) },
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const slotsByDay = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = format(slot.startsAt, "yyyy-MM-dd");
    const list = slotsByDay.get(key) ?? [];
    list.push(slot);
    slotsByDay.set(key, list);
  }

  const days: BoardDay[] = daysRange.map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const daySlots = slotsByDay.get(dateKey) ?? [];
    return {
      dateKey,
      label: formatDayLabel(day),
      slots: daySlots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        dateKey,
        dateLabel: formatDayLabel(day),
        startTime: formatTime(slot.startsAt),
        endTime: formatTime(slot.endsAt),
        assignments: slot.assignments.map((a) => {
          const slotStart = formatTime(slot.startsAt);
          const slotEnd = formatTime(slot.endsAt);
          const startTime = formatTime(a.startsAt);
          const endTime = formatTime(a.endsAt);
          return {
            id: a.id,
            userId: a.user.id,
            userName: a.user.name,
            startTime,
            endTime,
            adjusted: startTime !== slotStart || endTime !== slotEnd,
          };
        }),
      })),
    };
  });

  return (
    <div className="min-h-full bg-zinc-50">
      <ManagerNav current="planning" />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_280px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                Planning
              </h1>
              <p className="text-sm text-zinc-500">
                Semaine du {format(weekStart, "d MMM")} — créneaux & affectations
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/manager/planning?week=${prevWeek}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                ← Semaine préc.
              </a>
              <a
                href={`/manager/planning?week=${todayKey}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Aujourd’hui
              </a>
              <a
                href={`/manager/planning?week=${nextWeek}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Semaine suiv. →
              </a>
            </div>
          </div>

          <PlanningBoard employees={employees} days={days} />
        </section>

        <CreateSlotForm defaultDate={format(weekStart, "yyyy-MM-dd")} />
      </main>
    </div>
  );
}
