import Link from "next/link";
import { logoutAction } from "@/modules/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
      >
        Déconnexion
      </button>
    </form>
  );
}

export function ManagerNav({ current }: { current: string }) {
  const links = [
    { href: "/manager", label: "Dashboard", key: "dashboard" },
    { href: "/manager/employes", label: "Employés", key: "employes" },
    { href: "/manager/planning", label: "Planning", key: "planning" },
    { href: "/manager/heures", label: "Valider heures", key: "heures" },
    { href: "/manager/compta", label: "Compta", key: "compta" },
  ];

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/manager" className="text-lg font-semibold tracking-tight text-zinc-900">
            RC-Gestion
          </Link>
          <nav className="flex flex-wrap gap-1">
            {links.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={`rounded-md px-2.5 py-1.5 text-sm ${
                  current === link.key
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-zinc-400 sm:inline">
            Module Heures
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

export function EmployeeHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-zinc-900">
            RC-Gestion
          </p>
          <p className="text-sm text-zinc-500">{name}</p>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
