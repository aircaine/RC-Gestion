"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createInviteToken,
  hashToken,
  inviteExpiry,
  sendEmployeeInviteEmail,
} from "@/lib/email";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireManager() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    throw new Error("Non autorisé");
  }
  return session.user;
}

export async function createEmployeeAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireManager();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    return { ok: false, error: "Prénom, nom et email requis" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Cet email est déjà utilisé" };
  }

  const name = `${firstName} ${lastName}`;
  const { token, hash } = createInviteToken();

  await prisma.user.create({
    data: {
      name,
      email,
      role: "EMPLOYEE",
      active: false,
      passwordHash: null,
      inviteTokenHash: hash,
      inviteExpiresAt: inviteExpiry(7),
    },
  });

  const sent = await sendEmployeeInviteEmail({
    to: email,
    employeeName: firstName,
    token,
  });

  if (!sent.ok) {
    return {
      ok: false,
      error: `Employé créé mais l’e-mail n’a pas pu être envoyé : ${sent.error}`,
    };
  }

  revalidatePath("/manager/employes");
  return { ok: true };
}

export async function resendEmployeeInviteAction(
  id: string,
): Promise<ActionResult> {
  await requireManager();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "EMPLOYEE") {
    return { ok: false, error: "Employé introuvable" };
  }
  if (user.passwordHash) {
    return { ok: false, error: "Ce compte est déjà activé" };
  }

  const { token, hash } = createInviteToken();
  await prisma.user.update({
    where: { id },
    data: {
      inviteTokenHash: hash,
      inviteExpiresAt: inviteExpiry(7),
      active: false,
    },
  });

  const firstName = user.name.split(" ")[0] || user.name;
  const sent = await sendEmployeeInviteEmail({
    to: user.email,
    employeeName: firstName,
    token,
  });

  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }

  revalidatePath("/manager/employes");
  return { ok: true };
}

export async function acceptInviteAction(
  formData: FormData,
): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { ok: false, error: "Lien d’invitation invalide" };
  }
  if (password.length < 6) {
    return { ok: false, error: "Mot de passe : 6 caractères minimum" };
  }
  if (password !== confirm) {
    return { ok: false, error: "Les mots de passe ne correspondent pas" };
  }

  const hash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      inviteTokenHash: hash,
      inviteExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    return { ok: false, error: "Invitation invalide ou expirée" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      active: true,
      inviteTokenHash: null,
      inviteExpiresAt: null,
    },
  });

  return { ok: true };
}

export async function toggleEmployeeActiveAction(
  id: string,
): Promise<ActionResult> {
  await requireManager();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "EMPLOYEE") {
    return { ok: false, error: "Employé introuvable" };
  }
  if (!user.passwordHash) {
    return {
      ok: false,
      error: "Le compte n’est pas encore activé (invitation en attente)",
    };
  }
  await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });
  revalidatePath("/manager/employes");
  return { ok: true };
}

export async function createShiftSlotAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireManager();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name || !date || !startTime || !endTime) {
    return { ok: false, error: "Nom, date et horaires requis" };
  }

  const [y, m, d] = date.split("-").map(Number);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startsAt = new Date(y, m - 1, d, sh, sm, 0, 0);
  let endsAt = new Date(y, m - 1, d, eh, em, 0, 0);
  if (endsAt <= startsAt) {
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }

  await prisma.shiftSlot.create({
    data: { name, startsAt, endsAt, notes },
  });

  revalidatePath("/manager/planning");
  return { ok: true };
}

export async function deleteShiftSlotAction(id: string): Promise<ActionResult> {
  await requireManager();
  await prisma.shiftSlot.delete({ where: { id } });
  revalidatePath("/manager/planning");
  revalidatePath("/heures");
  return { ok: true };
}

export async function assignEmployeeToSlotAction(
  slotId: string,
  userId: string,
): Promise<ActionResult> {
  await requireManager();

  const [slot, employee] = await Promise.all([
    prisma.shiftSlot.findUnique({ where: { id: slotId } }),
    prisma.user.findFirst({
      where: { id: userId, role: "EMPLOYEE", active: true, passwordHash: { not: null } },
    }),
  ]);

  if (!slot) return { ok: false, error: "Créneau introuvable" };
  if (!employee) return { ok: false, error: "Employé introuvable" };

  const existing = await prisma.shift.findUnique({
    where: { slotId_userId: { slotId, userId } },
  });
  if (existing) {
    return { ok: false, error: "Employé déjà assigné à ce créneau" };
  }

  await prisma.shift.create({
    data: {
      slotId,
      userId,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    },
  });

  revalidatePath("/manager/planning");
  revalidatePath("/heures");
  return { ok: true };
}

export async function updateAssignmentTimesAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  const assignment = await prisma.shift.findUnique({
    where: { id },
    include: { slot: true },
  });
  if (!assignment) return { ok: false, error: "Affectation introuvable" };

  const base = assignment.slot.startsAt;
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startsAt = new Date(y, m, d, sh, sm, 0, 0);
  let endsAt = new Date(y, m, d, eh, em, 0, 0);
  if (endsAt <= startsAt) {
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }

  // Keep within reason relative to slot (± still allow early/late within day)
  await prisma.shift.update({
    where: { id },
    data: { startsAt, endsAt },
  });

  revalidatePath("/manager/planning");
  revalidatePath("/heures");
  return { ok: true };
}

export async function deleteShiftAction(id: string): Promise<ActionResult> {
  await requireManager();
  await prisma.shift.delete({ where: { id } });
  revalidatePath("/manager/planning");
  revalidatePath("/heures");
  return { ok: true };
}
