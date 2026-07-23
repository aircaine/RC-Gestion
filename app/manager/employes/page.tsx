import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerNav } from "@/components/nav";
import {
  CreateEmployeeForm,
  EditJobTitleForm,
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
    <div className="rc-page">
      <ManagerNav current="employes" />
      <main className="rc-main mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="mb-4 text-3xl font-semibold tracking-tight text-ink">
            Employés
          </h1>
          <div className="rc-panel overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Rôle</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const pendingInvite = !e.passwordHash;
                  return (
                    <tr key={e.id} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">
                        {e.name}
                      </td>
                      <td className="px-4 py-3">
                        <EditJobTitleForm id={e.id} jobTitle={e.jobTitle} />
                      </td>
                      <td className="px-4 py-3 text-muted">{e.email}</td>
                      <td className="px-4 py-3">
                        {pendingInvite ? (
                          <span className="text-copper">Invitation envoyée</span>
                        ) : e.active ? (
                          <span className="text-forest">Actif</span>
                        ) : (
                          <span className="text-muted">Inactif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ToggleEmployeeButton
                          id={e.id}
                          active={e.active}
                          pendingInvite={pendingInvite}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <CreateEmployeeForm />
      </main>
    </div>
  );
}
