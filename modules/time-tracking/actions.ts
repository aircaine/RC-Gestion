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
  const manager = await requireManager();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== "PENDING") {
    return { ok: false, error: "Déclaration introuvable ou déjà traitée" };
  }
  await prisma.timeEntry.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      validatedById: manager.id,
      validatedAt: new Date(),
    },
  });
  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}

/** Confirme une déclaration en permettant d'ajuster les horaires avant. */
export async function confirmTimeEntryWithTimesAction(
  formData: FormData,
): Promise<ActionResult> {
  const manager = await requireManager();
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const managerNote = String(formData.get("managerNote") ?? "").trim() || null;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== "PENDING") {
    return { ok: false, error: "Déclaration introuvable ou déjà traitée" };
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

  const timesChanged =
    startedAt.getTime() !== entry.startedAt.getTime() ||
    endedAt.getTime() !== entry.endedAt.getTime();

  await prisma.timeEntry.update({
    where: { id },
    data: {
      startedAt,
      endedAt,
      hours,
      status: timesChanged ? "ADJUSTED" : "CONFIRMED",
      managerNote,
      validatedById: manager.id,
      validatedAt: new Date(),
    },
  });

  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}

export async function confirmAllPendingAction(
  ids: string[],
): Promise<ActionResult> {
  const manager = await requireManager();
  if (ids.length === 0) {
    return { ok: false, error: "Aucune déclaration à confirmer" };
  }

  await prisma.timeEntry.updateMany({
    where: { id: { in: ids }, status: "PENDING" },
    data: {
      status: "CONFIRMED",
      validatedById: manager.id,
      validatedAt: new Date(),
    },
  });

  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}

/** Valide les heures d'une affectation passée (horaires optionnellement ajustés). */
export async function confirmPastAssignmentAction(
  formData: FormData | string,
): Promise<ActionResult> {
  const manager = await requireManager();

  const isForm = typeof formData !== "string";
  const shiftId = isForm
    ? String(formData.get("shiftId") ?? "")
    : formData;
  const date = isForm ? String(formData.get("date") ?? "") : "";
  const startTime = isForm ? String(formData.get("startTime") ?? "") : "";
  const endTime = isForm ? String(formData.get("endTime") ?? "") : "";
  const managerNote = isForm
    ? String(formData.get("managerNote") ?? "").trim() || null
    : null;

  const assignment = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { slot: true },
  });
  if (!assignment) {
    return { ok: false, error: "Affectation introuvable" };
  }
  if (assignment.endsAt > new Date()) {
    return { ok: false, error: "Ce service n’est pas encore terminé" };
  }

  let startedAt = assignment.startsAt;
  let endedAt = assignment.endsAt;
  if (date && startTime && endTime) {
    startedAt = combineDateAndTime(date, startTime);
    endedAt = combineDateAndTime(date, endTime);
    if (endedAt <= startedAt) {
      endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);
    }
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

  const timesChanged =
    startedAt.getTime() !== assignment.startsAt.getTime() ||
    endedAt.getTime() !== assignment.endsAt.getTime();

  const existing = await prisma.timeEntry.findFirst({
    where: {
      shiftId,
      status: { in: ["PENDING", "CONFIRMED", "ADJUSTED"] },
    },
  });

  if (existing) {
    if (existing.status === "PENDING") {
      await prisma.timeEntry.update({
        where: { id: existing.id },
        data: {
          startedAt,
          endedAt,
          hours,
          status: timesChanged ? "ADJUSTED" : "CONFIRMED",
          managerNote:
            managerNote ??
            `Validé selon planning (${assignment.slot.name})`,
          validatedById: manager.id,
          validatedAt: new Date(),
        },
      });
    } else {
      return { ok: false, error: "Heures déjà validées pour ce service" };
    }
  } else {
    await prisma.timeEntry.create({
      data: {
        userId: assignment.userId,
        shiftId: assignment.id,
        startedAt,
        endedAt,
        hours,
        source: "SCHEDULED",
        status: timesChanged ? "ADJUSTED" : "CONFIRMED",
        managerNote:
          managerNote ?? `Validé selon planning (${assignment.slot.name})`,
        validatedById: manager.id,
        validatedAt: new Date(),
      },
    });
  }

  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}

export async function confirmAllPastAssignmentsAction(
  shiftIds: string[],
): Promise<ActionResult> {
  const manager = await requireManager();
  if (shiftIds.length === 0) {
    return { ok: false, error: "Aucun service à valider" };
  }

  const now = new Date();
  const assignments = await prisma.shift.findMany({
    where: {
      id: { in: shiftIds },
      endsAt: { lte: now },
    },
    include: { slot: true },
  });

  for (const assignment of assignments) {
    const existing = await prisma.timeEntry.findFirst({
      where: {
        shiftId: assignment.id,
        status: { in: ["PENDING", "CONFIRMED", "ADJUSTED"] },
      },
    });

    if (existing) {
      if (existing.status === "PENDING") {
        await prisma.timeEntry.update({
          where: { id: existing.id },
          data: {
            status: "CONFIRMED",
            validatedById: manager.id,
            validatedAt: new Date(),
          },
        });
      }
      continue;
    }

    const hours = calculateHours(assignment.startsAt, assignment.endsAt);
    await prisma.timeEntry.create({
      data: {
        userId: assignment.userId,
        shiftId: assignment.id,
        startedAt: assignment.startsAt,
        endedAt: assignment.endsAt,
        hours,
        source: "SCHEDULED",
        status: "CONFIRMED",
        managerNote: `Validé selon planning (${assignment.slot.name})`,
        validatedById: manager.id,
        validatedAt: new Date(),
      },
    });
  }

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
  const manager = await requireManager();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.status !== "PENDING") {
    return { ok: false, error: "Déclaration introuvable ou déjà traitée" };
  }
  await prisma.timeEntry.update({
    where: { id },
    data: {
      status: "REJECTED",
      managerNote: managerNote?.trim() || null,
      validatedById: manager.id,
      validatedAt: new Date(),
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
  const manager = await requireManager();
  const id = String(formData.get("id") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const managerNoteRaw = formData.get("managerNote");

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) {
    return { ok: false, error: "Déclaration introuvable" };
  }

  const managerNote =
    managerNoteRaw === null
      ? entry.managerNote
      : String(managerNoteRaw).trim() || null;

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
      status: entry.status === "PENDING" ? "PENDING" : "ADJUSTED",
      managerNote,
      ...(entry.status !== "PENDING"
        ? { validatedById: manager.id, validatedAt: new Date() }
        : {}),
    },
  });

  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}

export async function deleteTimeEntryAction(
  id: string,
): Promise<ActionResult> {
  await requireManager();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) {
    return { ok: false, error: "Déclaration introuvable" };
  }

  await prisma.timeEntry.delete({ where: { id } });

  revalidatePath("/manager");
  revalidatePath("/manager/heures");
  revalidatePath("/manager/compta");
  revalidatePath("/heures");
  return { ok: true };
}
