import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

type SearchParams = Promise<{ activated?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activated = params.activated === "1";

  return (
    <main className="rc-auth-bg flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="rc-shell relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href={null} size="lg" variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#c5d4cb]">
            Planifiez, déclarez et validez les heures de votre équipe.
          </p>
        </div>
        <div className="rc-panel p-6 sm:p-7">
          {activated ? (
            <p className="mb-4 rounded-xl bg-forest-soft px-3 py-2.5 text-sm text-forest">
              Compte activé. Connectez-vous avec votre e-mail et mot de passe.
            </p>
          ) : null}
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-[#9db0a5]">
          Accès réservé au personnel du restaurant
        </p>
      </div>
    </main>
  );
}
