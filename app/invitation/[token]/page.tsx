import { AcceptInviteForm } from "@/components/accept-invite-form";
import { Logo } from "@/components/logo";
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
    <main className="rc-auth-bg flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="rc-shell relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href={null} size="lg" variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#c5d4cb]">
            Créez votre mot de passe pour activer votre compte
          </p>
        </div>
        <div className="rc-panel p-6 sm:p-7">
          {!user ? (
            <p className="text-sm text-[#8f2f2f]">
              Cette invitation est invalide ou a expiré. Demandez à votre
              manager de renvoyer l’invitation.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Bonjour{" "}
                <span className="font-medium text-ink">{user.name}</span> (
                {user.email})
              </p>
              <AcceptInviteForm token={token} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
