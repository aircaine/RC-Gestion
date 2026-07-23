import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";

export function createInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiry(days = 7): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function appBaseUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "RC-Gestion <onboarding@resend.dev>";
}

export async function sendEmployeeInviteEmail(params: {
  to: string;
  employeeName: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY manquant" };
  }

  const resend = new Resend(apiKey);
  const link = `${appBaseUrl()}/invitation/${params.token}`;

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: params.to,
    subject: "Créez votre compte RC-Gestion",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
        <h1 style="font-size: 22px; margin-bottom: 8px;">Bienvenue sur RC-Gestion</h1>
        <p style="margin: 0 0 16px;">Bonjour ${escapeHtml(params.employeeName)},</p>
        <p style="margin: 0 0 16px;">
          Votre manager vous invite à créer votre compte pour déclarer vos heures.
          Cliquez sur le bouton ci-dessous pour choisir votre mot de passe.
        </p>
        <p style="margin: 24px 0;">
          <a href="${link}"
             style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
            Créer mon mot de passe
          </a>
        </p>
        <p style="font-size: 13px; color: #71717a; margin: 0 0 8px;">
          Ou copiez ce lien : <br/>
          <a href="${link}" style="color:#3b82f6; word-break: break-all;">${link}</a>
        </p>
        <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px;">
          Ce lien expire dans 7 jours. Si vous n’êtes pas concerné, ignorez cet e-mail.
        </p>
      </div>
    `,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
