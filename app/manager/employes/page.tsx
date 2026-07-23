import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import {
  CreateEmployeeForm,
  ToggleEmployeeButton,
} from "@/components/manager-forms";

export const dynamic = "force-dynamic";

export default async function EmployesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/heures");

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-full bg-zinc-50">
      <ManagerNav current="employes" />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-900">
            Employés
          </h1>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {e.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{e.email}</td>
                    <td className="px-4 py-3">
                      {e.active ? (
                        <span className="text-emerald-700">Actif</span>
                      ) : (
                        <span className="text-zinc-400">Inactif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ToggleEmployeeButton id={e.id} active={e.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <CreateEmployeeForm />
      </main>
    </div>
  );
}
