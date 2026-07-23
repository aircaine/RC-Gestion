import { AcceptInviteForm } from "@/components/accept-invite-form";
import { hashToken } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function InvitationPage({ params }: { params: Params }) {
  const { token } = await params;
  const hash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      inviteTokenHash: hash,
      inviteExpiresAt: { gt: new Date() },
    },
    select: { name: true, email: true },
  });

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            RC-Gestion
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Créez votre mot de passe pour activer votre compte
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {!user ? (
            <p className="text-sm text-rose-700">
              Cette invitation est invalide ou a expiré. Demandez à votre
              manager de renvoyer l’invitation.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-zinc-600">
                Bonjour <span className="font-medium text-zinc-900">{user.name}</span>
                {" "}({user.email})
              </p>
              <AcceptInviteForm token={token} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
