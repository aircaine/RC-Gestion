"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateHours,
  combineDateAndTime,
} from "@/modules/time-tracking/hours";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireEmployee() {
  const session = await auth();
  if (!session?.user || session.user.role !== "EMPLOYEE") {
    throw new Error("Non autorisé");
  }
  return session.user;
}

async function requireManager() {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    throw new Error("Non autorisé");
  }
  return session.user;
}

export async function declareHoursAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireEmployee();

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const shiftIdRaw = String(formData.get("shiftId") ?? "");
  const employeeNote = String(formData.get("employeeNote") ?? "").trim() || null;
  const shiftId = shiftIdRaw && shiftIdRaw !== "none" ? shiftIdRaw : null;

  if (!date || !startTime || !endTime) {
    return { ok: false, error: "Date et horaires requis" };
  }

  let startedAt: Date;
  let endedAt: Date;
  try {
    startedAt = combineDateAndTime(date, startTime);
    endedAt = combineDateAndTime(date, endTime);
  } catch {
    return { ok: false, error: "Date ou heure invalide" };
  }

  // Overnight shift: end after midnight
  if (endedAt <= startedAt) {
    endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);
  }

  let hours: number;
  try {
    hours = calculateHours(startedAt, endedAt);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Horaires invalides",
    };
  }

  if (hours > 16) {
    return { ok: false, error: "Durée maximale 16 heures" };
  }

  let source: "SCHEDULED" | "FREE" = "FREE";
  if (shiftId) {
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, userId: user.id },
    });
    if (!shift) {
      return { ok: false, error: "Shift introuvable" };
    }
    source = "SCHEDULED";
  }

  await prisma.timeEntry.create({
    data: {
      userId: user.id,
      shiftId,
      startedAt,
      endedAt,
      hours,
      source,
      status: "PENDING",
      employeeNote,
    },
  });

  revalidatePath("/heures");
  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  return { ok: true };
}

export async function confirmTimeEntryAction(
  id: string,
): Promise<ActionResult> {
  await requireManager();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== "PENDING") {
    return { ok: false, error: "Déclaration introuvable ou déjà traitée" };
  }
  await prisma.timeEntry.update({
    where: { id },
    data: { status: "CONFIRMED" },
  });
  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}

export async function rejectTimeEntryAction(
  id: string,
  managerNote?: string,
): Promise<ActionResult> {
  await requireManager();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== "PENDING") {
    return { ok: false, error: "Déclaration introuvable ou déjà traitée" };
  }
  await prisma.timeEntry.update({
    where: { id },
    data: {
      status: "REJECTED",
      managerNote: managerNote?.trim() || null,
    },
  });
  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/heures");
  return { ok: true };
}

export async function adjustTimeEntryAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireManager();
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const managerNote = String(formData.get("managerNote") ?? "").trim() || null;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || (entry.status !== "PENDING" && entry.status !== "CONFIRMED")) {
    return { ok: false, error: "Déclaration non modifiable" };
  }

  const startedAt = combineDateAndTime(date, startTime);
  let endedAt = combineDateAndTime(date, endTime);
  if (endedAt <= startedAt) {
    endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);
  }

  let hours: number;
  try {
    hours = calculateHours(startedAt, endedAt);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Horaires invalides",
    };
  }

  await prisma.timeEntry.update({
    where: { id },
    data: {
      startedAt,
      endedAt,
      hours,
      status: "ADJUSTED",
      managerNote,
    },
  });

  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}
