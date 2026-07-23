import { formatHours } from "@/modules/time-tracking/hours";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  ADJUSTED: "Ajusté",
  REJECTED: "Rejeté",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-[var(--amber-soft)] text-[#8a5a12]",
  CONFIRMED: "bg-forest-soft text-forest",
  ADJUSTED: "bg-[var(--sky-soft)] text-[#2a5575]",
  REJECTED: "bg-[var(--rose-soft)] text-[#8f2f2f]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? "bg-paper-deep text-muted"}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function HoursLabel({ hours }: { hours: number }) {
  return <span className="font-medium tabular-nums">{formatHours(hours)}</span>;
}
