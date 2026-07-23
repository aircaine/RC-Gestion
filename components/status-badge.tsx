import { formatHours } from "@/modules/time-tracking/hours";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  ADJUSTED: "Ajusté",
  REJECTED: "Rejeté",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-emerald-100 text-emerald-900",
  ADJUSTED: "bg-sky-100 text-sky-900",
  REJECTED: "bg-rose-100 text-rose-900",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-zinc-100 text-zinc-800"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function HoursLabel({ hours }: { hours: number }) {
  return <span className="font-medium tabular-nums">{formatHours(hours)}</span>;
}
