"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    return {
      ok: false,
      error: "Nom, email et mot de passe (6+ caractères) requis",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Cet email est déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "EMPLOYEE",
      active: true,
    },
  });

  revalidatePath("/manager/employes");
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
  await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });
  revalidatePath("/manager/employes");
  return { ok: true };
}

export async function createShiftAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireManager();
  const userId = String(formData.get("userId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!userId || !date || !startTime || !endTime) {
    return { ok: false, error: "Tous les champs obligatoires manquants" };
  }

  const employee = await prisma.user.findFirst({
    where: { id: userId, role: "EMPLOYEE", active: true },
  });
  if (!employee) {
    return { ok: false, error: "Employé introuvable" };
  }

  const [y, m, d] = date.split("-").map(Number);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startsAt = new Date(y, m - 1, d, sh, sm, 0, 0);
  let endsAt = new Date(y, m - 1, d, eh, em, 0, 0);
  if (endsAt <= startsAt) {
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }

  await prisma.shift.create({
    data: { userId, startsAt, endsAt, notes },
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
