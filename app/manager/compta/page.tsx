import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import { HoursLabel } from "@/components/status-badge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ from?: string; to?: string }>;

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");
}

export default async function ComptaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/heures");

  const params = await searchParams;
  const now = new Date();
  const defaultFrom = format(
    new Date(now.getFullYear(), now.getMonth(), 1),
    "yyyy-MM-dd",
  );
  const defaultTo = format(now, "yyyy-MM-dd");
  const fromStr = params.from ?? defaultFrom;
  const toStr = params.to ?? defaultTo;

  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T23:59:59`);

  const entries = await prisma.timeEntry.findMany({
    where: {
      status: { in: ["CONFIRMED", "ADJUSTED"] },
      startedAt: { gte: from, lte: to },
    },
    include: { user: true },
    orderBy: [{ user: { name: "asc" } }, { startedAt: "asc" }],
  });

  const byEmployee = new Map<
    string,
    { name: string; email: string; hours: number; count: number }
  >();

  for (const e of entries) {
    const current = byEmployee.get(e.userId) ?? {
      name: e.user.name,
      email: e.user.email,
      hours: 0,
      count: 0,
    };
    current.hours += e.hours;
    current.count += 1;
    byEmployee.set(e.userId, current);
  }

  const totals = Array.from(byEmployee.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const grandTotal = totals.reduce((s, t) => s + t.hours, 0);

  const csv = toCsv([
    ["Nom", "Email", "Nb déclarations", "Heures"],
    ...totals.map((t) => [
      t.name,
      t.email,
      String(t.count),
      t.hours.toFixed(2),
    ]),
    ["TOTAL", "", "", grandTotal.toFixed(2)],
  ]);

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <div className="rc-page">
      <ManagerNav current="compta" />
      <main className="rc-main mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              Compta
            </h1>
            <p className="text-sm text-muted">
              Totaux heures confirmées / ajustées
            </p>
          </div>
          <a
            href={csvHref}
            download={`heures-${fromStr}-${toStr}.csv`}
            className="rc-btn rc-btn-primary hover:bg-forest-hover"
          >
            Export CSV
          </a>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3">
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
          <button
            type="submit"
            className="rc-input w-auto text-sm font-medium text-ink hover:bg-paper"
          >
            Appliquer
          </button>
        </form>

        <div className="rc-panel p-4">
          <p className="text-sm text-muted">Total période</p>
          <p className="text-3xl font-semibold text-ink">
            <HoursLabel hours={grandTotal} />
          </p>
        </div>

        <div className="rc-panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Employé</th>
                <th className="px-4 py-2 font-medium">Déclarations</th>
                <th className="px-4 py-2 font-medium">Heures</th>
              </tr>
            </thead>
            <tbody>
              {totals.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-muted">
                    Aucune heure confirmée sur la période.
                  </td>
                </tr>
              ) : (
                totals.map((t) => (
                  <tr
                    key={t.email}
                    className="border-b border-line/50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="text-xs text-muted">{t.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{t.count}</td>
                    <td className="px-4 py-3">
                      <HoursLabel hours={t.hours} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
