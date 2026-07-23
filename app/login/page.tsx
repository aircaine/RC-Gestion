import { LoginForm } from "@/components/login-form";

type SearchParams = Promise<{ activated?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activated = params.activated === "1";

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            RC-Gestion
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Gestion des heures — restaurant
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {activated ? (
            <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Compte activé. Connectez-vous avec votre e-mail et mot de passe.
            </p>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
