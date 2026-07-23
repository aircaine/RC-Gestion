/** Compute decimal hours between two dates (e.g. 7.5). */
export function calculateHours(startedAt: Date, endedAt: Date): number {
  const ms = endedAt.getTime() - startedAt.getTime();
  if (ms <= 0) {
    throw new Error("L'heure de fin doit être après l'heure de début");
  }
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Combine a date (YYYY-MM-DD) and time (HH:MM) into a Date in local interpretation stored as UTC ISO via Date. */
export function combineDateAndTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
