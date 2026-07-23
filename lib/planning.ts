import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type BoardEmployee = { id: string; name: string; jobTitle?: string | null };

export type BoardAssignment = {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  adjusted: boolean;
};

export type BoardSlot = {
  id: string;
  name: string;
  dateKey: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  assignments: BoardAssignment[];
};

export type BoardDay = {
  dateKey: string;
  label: string;
  slots: BoardSlot[];
};

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE d MMM", { locale: fr });
}
