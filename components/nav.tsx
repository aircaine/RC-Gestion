import Link from "next/link";
import { logoutAction } from "@/modules/auth/actions";
import { Logo } from "@/components/logo";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="rc-btn rc-btn-ghost text-sm">
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
    { href: "/manager/heures", label: "Heures", key: "heures" },
    { href: "/manager/compta", label: "Compta", key: "compta" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <Logo href="/manager" size="sm" />
          <nav className="flex flex-wrap gap-0.5" aria-label="Navigation manager">
            {links.map((link) => {
              const active = current === link.key;
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-forest text-white"
                      : "text-muted hover:bg-forest-soft hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-copper-soft px-2.5 py-1 text-[11px] font-medium tracking-wide text-copper uppercase sm:inline">
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
    <header className="sticky top-0 z-30 border-b border-line/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo href="/heures" size="sm" />
          <div className="hidden border-l border-line pl-3 sm:block">
            <p className="text-sm font-medium text-ink">{name}</p>
            <p className="text-xs text-muted">Espace employé</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
